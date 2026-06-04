/**
 * Decodifica la salida cruda del detector YOLO11n de placas y aplica NMS.
 *
 * El modelo TFLite (exportado por Ultralytics) entrega un tensor [1, 5, 3549]:
 *   fila 0..3 -> cx, cy, w, h  (coordenadas normalizadas 0..1 sobre la entrada 416)
 *   fila 4    -> confianza de la clase única "placa" (ya pasada por sigmoide)
 * Se aplana en orden row-major, así out[c * N + i] = valor del canal c, ancla i.
 */

/** Tipo de vehículo inferido a partir del color + forma de la placa. */
export type PlateType = 'carro' | 'moto' | 'publico' | 'desconocido';

/** Color de fondo de la placa (señal principal para particular vs público). */
export type PlateColor = 'amarilla' | 'blanca' | 'desconocido';

export interface Detection {
  /** Esquina superior-izquierda + tamaño, normalizado 0..1 sobre el frame. */
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  /** Clasificación de vehículo (se rellena tras muestrear color + aspecto). */
  type?: PlateType;
  color?: PlateColor;
}

/** Etiqueta legible en español para mostrar en el overlay. */
export const PLATE_LABEL: Record<PlateType, string> = {
  carro: 'Carro',
  moto: 'Moto',
  publico: 'Público',
  desconocido: 'Placa',
};

const NUM_ANCHORS = 3549;
const DEFAULT_CONF = 0.4;
const DEFAULT_IOU = 0.45;

/** Intersección sobre unión de dos cajas (formato x,y,w,h). */
function iou(a: Detection, b: Detection): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;

  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);

  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  if (inter <= 0) return 0;

  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

/** Non-Maximum Suppression: descarta cajas muy solapadas, deja la de mayor conf. */
export function nms(dets: Detection[], iouThreshold = DEFAULT_IOU): Detection[] {
  const sorted = [...dets].sort((a, b) => b.confidence - a.confidence);
  const kept: Detection[] = [];
  for (const d of sorted) {
    if (kept.every((k) => iou(k, d) < iouThreshold)) kept.push(d);
  }
  return kept;
}

export interface DecodeOptions {
  confThreshold?: number;
  iouThreshold?: number;
}

/**
 * Convierte el tensor crudo en una lista de detecciones (ya con NMS),
 * ordenadas por confianza descendente.
 */
export function decodeYolo(
  output: Float32Array | number[],
  { confThreshold = DEFAULT_CONF, iouThreshold = DEFAULT_IOU }: DecodeOptions = {},
): Detection[] {
  const N = NUM_ANCHORS;

  // Las coords deberían venir normalizadas (0..1). Si el export las dejó en
  // píxeles (0..416), lo detectamos y reescalamos. Revisamos el máximo de cx.
  let maxCx = 0;
  for (let i = 0; i < N; i++) {
    const v = output[i];
    if (v > maxCx) maxCx = v;
  }
  const scale = maxCx > 2 ? 1 / 416 : 1;

  const dets: Detection[] = [];
  for (let i = 0; i < N; i++) {
    const confidence = output[4 * N + i];
    if (confidence < confThreshold) continue;

    const cx = output[i] * scale;
    const cy = output[N + i] * scale;
    const w = output[2 * N + i] * scale;
    const h = output[3 * N + i] * scale;

    dets.push({ x: cx - w / 2, y: cy - h / 2, w, h, confidence });
  }

  return nms(dets, iouThreshold);
}

// --- Clasificación de vehículo (post-detección) ---------------------------
//
// El modelo solo dice "esto es una placa". El tipo de vehículo se infiere como
// en el prototipo de Python:
//   · Color de fondo:  amarilla -> particular (carro/moto) | blanca -> público
//   · Forma:           placa ancha -> carro | placa cuadrada (2 líneas) -> moto
// El color se muestrea dentro de la caja sobre el buffer RGBA de 416x416, y el
// aspecto se calcula en píxeles reales de la foto (no del cuadrado estirado).

// Umbral de relación de aspecto (ancho/alto real) que separa carro de moto.
const CARRO_MIN_ASPECT = 1.7;

/** Clasifica el color de fondo muestreando la zona interior de la caja. */
function sampleColor(
  pixels: Uint8Array,
  inputSize: number,
  det: Detection,
): PlateColor {
  // Recortar al interior de la caja (60% central) para evitar bordes/carrocería.
  const inset = 0.2;
  const x0 = Math.max(0, Math.floor((det.x + det.w * inset) * inputSize));
  const y0 = Math.max(0, Math.floor((det.y + det.h * inset) * inputSize));
  const x1 = Math.min(inputSize - 1, Math.ceil((det.x + det.w * (1 - inset)) * inputSize));
  const y1 = Math.min(inputSize - 1, Math.ceil((det.y + det.h * (1 - inset)) * inputSize));
  if (x1 <= x0 || y1 <= y0) return 'desconocido';

  // Muestrear ~como máximo 24x24 puntos dentro de la zona.
  const stepX = Math.max(1, Math.floor((x1 - x0) / 24));
  const stepY = Math.max(1, Math.floor((y1 - y0) / 24));

  let yellow = 0;
  let white = 0;
  let total = 0;
  for (let y = y0; y <= y1; y += stepY) {
    for (let x = x0; x <= x1; x += stepX) {
      const p = (y * inputSize + x) * 4;
      const r = pixels[p];
      const g = pixels[p + 1];
      const b = pixels[p + 2];
      total++;
      // Amarillo: rojo y verde altos, azul claramente más bajo.
      if (r > 110 && g > 90 && r - b > 45 && g - b > 20) yellow++;
      // Blanco/gris claro: los tres canales altos y parecidos entre sí.
      else if (r > 140 && g > 140 && b > 135 && Math.max(r, g, b) - Math.min(r, g, b) < 45) white++;
    }
  }
  if (total === 0) return 'desconocido';

  const yFrac = yellow / total;
  const wFrac = white / total;
  if (yFrac < 0.12 && wFrac < 0.12) return 'desconocido';
  return yFrac >= wFrac ? 'amarilla' : 'blanca';
}

/**
 * Rellena `type` y `color` de una detección a partir del color de fondo y la
 * relación de aspecto real (necesita las dimensiones reales de la foto).
 */
export function classifyDetection(
  det: Detection,
  pixels: Uint8Array,
  inputSize: number,
  imageWidth: number,
  imageHeight: number,
): Detection {
  const color = sampleColor(pixels, inputSize, det);

  // Aspecto en píxeles reales (las coords normalizadas valen sobre la foto).
  const realW = det.w * imageWidth;
  const realH = det.h * imageHeight;
  const aspect = realH > 0 ? realW / realH : 0;

  let type: PlateType;
  if (color === 'blanca') {
    type = 'publico';
  } else {
    // Amarilla o color indeterminado: decidir carro vs moto por la forma.
    type = aspect >= CARRO_MIN_ASPECT ? 'carro' : 'moto';
  }

  return { ...det, color, type };
}
