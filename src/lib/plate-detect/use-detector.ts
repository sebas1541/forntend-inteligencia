import {
  AlphaType,
  ColorType,
  ImageFormat,
  Skia,
} from '@shopify/react-native-skia';
import { useCallback } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';

import { classifyDetection, decodeYolo, type Detection } from './decode';

// Tamaño de entrada del detector (cuadrado, igual al imgsz de entrenamiento).
const INPUT_SIZE = 416;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MODEL = require('../../../assets/model/placa_detector.tflite');

export interface PlateDetector {
  /** True cuando el modelo TFLite ya cargó y se puede llamar a detect(). */
  ready: boolean;
  loading: boolean;
  error?: string;
  /**
   * Corre el detector sobre una foto (path del archivo) y devuelve las cajas
   * normalizadas (0..1) ya con NMS, ordenadas por confianza.
   */
  detect: (photoPath: string) => Promise<Detection[]>;
}

/**
 * Carga el modelo y expone detect(): decodifica la foto con Skia, la reescala a
 * 416x416 RGB normalizado y la pasa por el modelo (snapshot loop, sin worklets).
 */
export function usePlateDetector(): PlateDetector {
  const plugin = useTensorflowModel(MODEL, []);
  const model = plugin.state === 'loaded' ? plugin.model : undefined;

  const detect = useCallback(
    async (photoPath: string): Promise<Detection[]> => {
      if (!model) return [];

      const uri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;

      // 1. Decodificar la foto en una imagen Skia.
      const data = await Skia.Data.fromURI(uri);
      const image = Skia.Image.MakeImageFromEncoded(data);
      if (!image) return [];

      // 2. Dibujarla estirada a 416x416 en una superficie offscreen.
      const surface = Skia.Surface.MakeOffscreen(INPUT_SIZE, INPUT_SIZE);
      if (!surface) {
        image.dispose?.();
        return [];
      }
      const imgW = image.width();
      const imgH = image.height();
      const canvas = surface.getCanvas();
      const src = Skia.XYWHRect(0, 0, imgW, imgH);
      const dst = Skia.XYWHRect(0, 0, INPUT_SIZE, INPUT_SIZE);
      canvas.drawImageRect(image, src, dst, Skia.Paint());
      surface.flush();
      const snapshot = surface.makeImageSnapshot();

      // 3. Leer los píxeles RGBA (0..255).
      const pixels = snapshot.readPixels(0, 0, {
        width: INPUT_SIZE,
        height: INPUT_SIZE,
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Unpremul,
      }) as Uint8Array | null;

      image.dispose?.();
      snapshot.dispose?.();

      if (!pixels) return [];

      // 4. RGBA(0..255) -> RGB(0..1) en orden NHWC para el tensor de entrada.
      const input = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
      for (let i = 0, j = 0; i < pixels.length; i += 4) {
        input[j++] = pixels[i] / 255;
        input[j++] = pixels[i + 1] / 255;
        input[j++] = pixels[i + 2] / 255;
      }

      // 5. Inferencia (Nitro usa ArrayBuffer[]).
      const outputs = await model.run([input.buffer]);
      const out = new Float32Array(outputs[0]);

      // 6. Decodificar + NMS, luego clasificar cada placa por color + forma.
      const dets = decodeYolo(out);
      return dets.map((d) => classifyDetection(d, pixels, INPUT_SIZE, imgW, imgH));
    },
    [model],
  );

  return {
    ready: plugin.state === 'loaded',
    loading: plugin.state === 'loading',
    error: plugin.state === 'error' ? plugin.error.message : undefined,
    detect,
  };
}

export type { Detection };

/**
 * Recorta la región de la placa de la foto (con padding), la reescala a un ancho
 * cómodo para OCR y la devuelve como JPEG base64. Para enviar al backend (/ocr).
 */
export async function cropPlateToBase64(
  photoPath: string,
  det: Detection,
  pad = 0.12,
): Promise<string | null> {
  const uri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) return null;

  const iw = image.width();
  const ih = image.height();
  const x = Math.max(0, (det.x - det.w * pad) * iw);
  const y = Math.max(0, (det.y - det.h * pad) * ih);
  const w = Math.min(iw - x, det.w * (1 + pad * 2) * iw);
  const h = Math.min(ih - y, det.h * (1 + pad * 2) * ih);
  if (w < 4 || h < 4) {
    image.dispose?.();
    return null;
  }

  // Ampliar el recorte para que el texto quede grande (mejor OCR).
  const targetW = 480;
  const scale = w > 0 ? targetW / w : 1;
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const surface = Skia.Surface.MakeOffscreen(outW, outH);
  if (!surface) {
    image.dispose?.();
    return null;
  }
  const canvas = surface.getCanvas();
  canvas.drawImageRect(image, Skia.XYWHRect(x, y, w, h), Skia.XYWHRect(0, 0, outW, outH), Skia.Paint());
  surface.flush();
  const snap = surface.makeImageSnapshot();
  const b64 = snap.encodeToBase64(ImageFormat.JPEG, 92);
  image.dispose?.();
  snap.dispose?.();
  return b64;
}
