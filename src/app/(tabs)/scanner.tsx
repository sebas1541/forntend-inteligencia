import { useFocusEffect } from 'expo-router';
import { CameraOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GlassButton } from '@/components/glass/glass-button';
import { GlassCard } from '@/components/glass/glass-card';
import { Screen } from '@/components/ui/screen';
import { VehicleArt } from '@/components/vehicle-art';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import {
  cropPlateToBase64,
  usePlateDetector,
  type Detection,
} from '@/lib/plate-detect/use-detector';
import { PLATE_LABEL, type PlateType } from '@/lib/plate-detect/decode';
import { readPlate } from '@/lib/plate-detect/ocr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getCurrentCoords } from '@/lib/use-location';

// No re-guardar la misma placa antes de este tiempo (evita spam mientras apuntas).
const SAVE_COOLDOWN = 60_000;

// Mínima confianza para intentar leer el texto, y cada cuánto (ms) hacer OCR.
const OCR_MIN_CONF = 0.55;
const OCR_INTERVAL = 1500;

type PlateRead = { plate: string | null; type: PlateType };

// Color de la caja/etiqueta según el tipo de vehículo.
const TYPE_COLOR: Record<PlateType, string> = {
  carro: '#16A34A', // verde
  moto: '#4F46E5', // índigo (primario de la app)
  publico: '#334155', // gris pizarra (placa pública blanca)
  desconocido: '#6B7280', // gris
};

// Pausa entre capturas (ms).
const LOOP_DELAY = 350;
// Respiro tras inicializar la cámara antes de la 1ª foto (evita el -11803).
const WARMUP_DELAY = 700;
// Back-off cuando una captura falla.
const ERROR_BACKOFF = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ScannerScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const detector = usePlateDetector();
  const { token } = useAuth();
  // Placas ya guardadas (placa -> timestamp) para no duplicar mientras apuntas.
  const savedRef = useRef<Map<string, number>>(new Map());

  const camera = useRef<Camera>(null);
  // Refs sincronizados con el estado para que el while los lea siempre frescos.
  const activeRef = useRef(false);
  const runningRef = useRef(false);
  const initializedRef = useRef(false);
  // detect() se recrea al cargar el modelo; lo guardamos en un ref para no
  // reiniciar el loop cuando cambia su identidad.
  const detectRef = useRef(detector.detect);
  detectRef.current = detector.detect;

  const lastOcrRef = useRef(0);
  const ocrBusyRef = useRef(false);
  // App en primer plano. Al irse a background, iOS suspende la cámara: hay que
  // parar el loop ANTES para no rechazar la promesa de takePhoto dos veces (-11803).
  const appActiveRef = useRef(true);

  const [isActive, setActive] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [boxes, setBoxes] = useState<Detection[]>([]);
  const [plateRead, setPlateRead] = useState<PlateRead | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Animación de la tarjeta de resultado: entra suave desde abajo (con un pop)
  // cada vez que se lee una placa nueva.
  const cardAnim = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardAnim.value,
    transform: [
      { translateY: (1 - cardAnim.value) * 44 },
      { scale: 0.9 + cardAnim.value * 0.1 },
    ],
  }));
  useEffect(() => {
    if (plateRead?.plate) {
      cardAnim.value = 0;
      cardAnim.value = withSpring(1, { damping: 13, stiffness: 170, mass: 0.8 });
    } else {
      cardAnim.value = withTiming(0, { duration: 150 });
    }
  }, [plateRead?.plate, cardAnim]);

  // Stream solo mientras la pestaña Escanear está enfocada.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => {
        setActive(false);
        setBoxes([]);
        setPlateRead(null);
      };
    }, []),
  );

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  // Pausar la cámara + el loop apenas la app deja el primer plano (al cerrarla),
  // antes de que iOS suspenda la sesión y reviente la captura en curso.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      appActiveRef.current = active;
      if (!active) activeRef.current = false; // corta el loop de inmediato
      setAppActive(active);
    });
    return () => sub.remove();
  }, []);

  // Auto-guardar en el historial: al leer una placa válida y estable (~0.8s),
  // la registra en /plates con tipo + ubicación. De-dup por cooldown. Solo logueado.
  useEffect(() => {
    const plate = plateRead?.plate;
    const type = plateRead?.type ?? 'desconocido';
    if (!plate || !token) return;
    const last = savedRef.current.get(plate) ?? 0;
    if (Date.now() - last < SAVE_COOLDOWN) return;

    const id = setTimeout(async () => {
      savedRef.current.set(plate, Date.now());
      try {
        const coords = await getCurrentCoords();
        await api.createPlate(token, {
          plate,
          plate_type: type,
          lat: coords?.latitude ?? null,
          lng: coords?.longitude ?? null,
        });
        setSavedFlash(plate);
        setTimeout(() => setSavedFlash((p) => (p === plate ? null : p)), 1800);
      } catch {
        savedRef.current.delete(plate); // falló → permitir reintento
      }
    }, 800);
    return () => clearTimeout(id);
  }, [plateRead?.plate, plateRead?.type, token]);

  // OCR de la placa: recorta el top box, lo manda al backend y refina el tipo.
  // Throttled (cada OCR_INTERVAL) y sin solapamiento; no bloquea el loop.
  const maybeReadPlate = useCallback((photoPath: string, top: Detection | undefined) => {
    if (!top || top.confidence < OCR_MIN_CONF) return;
    if (ocrBusyRef.current) return;
    if (Date.now() - lastOcrRef.current < OCR_INTERVAL) return;
    ocrBusyRef.current = true;
    lastOcrRef.current = Date.now();
    void (async () => {
      try {
        const b64 = await cropPlateToBase64(photoPath, top);
        if (b64) {
          const res = await readPlate(b64); // OCR on-device (Vision/ML Kit)
          // Color manda para público; si no, el formato del OCR; si no, la heurística.
          const type: PlateType =
            top.color === 'blanca'
              ? 'publico'
              : res.type === 'carro' || res.type === 'moto'
                ? res.type
                : top.type ?? 'desconocido';
          if (activeRef.current && (res.plate || type !== 'desconocido')) {
            setPlateRead({ plate: res.plate, type });
          }
        }
      } catch {
        // OCR falló (sin red / backend caído) → se reintenta en el próximo ciclo.
      } finally {
        ocrBusyRef.current = false;
      }
    })();
  }, []);

  // Bucle de captura: foto -> modelo -> cajas. Una sola instancia (runningRef),
  // una sola captura en vuelo a la vez (await serial), sin solapamiento.
  const runLoop = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    // Dejar que AVFoundation termine de arrancar antes de la primera foto.
    await sleep(WARMUP_DELAY);
    while (activeRef.current && appActiveRef.current && initializedRef.current) {
      const cam = camera.current;
      if (!cam) break;
      try {
        // Re-chequear justo antes de capturar (la app pudo irse a background).
        if (!appActiveRef.current || !activeRef.current) break;
        const photo = await cam.takePhoto({ enableShutterSound: false });
        const dets = await detectRef.current(photo.path);
        if (!activeRef.current) break;
        setBoxes(dets);
        if (dets.length === 0) setPlateRead(null);
        maybeReadPlate(photo.path, dets[0]);
      } catch {
        // Captura/inferencia falló: esperar un poco más y reintentar.
        await sleep(ERROR_BACKOFF);
        continue;
      }
      await sleep(LOOP_DELAY);
    }
    runningRef.current = false;
  }, []);

  useEffect(() => {
    const canRun =
      isActive && appActive && initialized && detector.ready && hasPermission && !!device;
    activeRef.current = canRun;
    initializedRef.current = initialized;
    if (canRun) void runLoop();
    return () => {
      activeRef.current = false;
    };
  }, [isActive, appActive, initialized, detector.ready, hasPermission, device, runLoop]);

  if (!hasPermission) {
    return (
      <Fallback
        title="Permiso de cámara"
        message="QuickPlate necesita acceso a la cámara para escanear placas."
        actionLabel="Permitir cámara"
        onAction={() => {
          void requestPermission().then((granted) => {
            if (!granted) void Linking.openSettings();
          });
        }}
      />
    );
  }

  if (!device) {
    return (
      <Fallback
        title="Sin cámara"
        message="No se encontró una cámara trasera. Probá en un dispositivo físico (el simulador no tiene cámara)."
      />
    );
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  return (
    <View style={styles.fill} onLayout={onLayout}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && appActive}
        photo
        photoQualityBalance="speed"
        onInitialized={() => setInitialized(true)}
        onError={() => setInitialized(false)}
      />

      {/* Cajas detectadas, mapeadas al rectángulo del preview. */}
      {size.w > 0 &&
        boxes.map((b, i) => {
          // El top box (i===0) usa el tipo refinado por OCR + el texto leído.
          const type = (i === 0 && plateRead?.type) || b.type || 'desconocido';
          const color = TYPE_COLOR[type];
          const label =
            i === 0 && plateRead?.plate
              ? `${plateRead.plate} · ${PLATE_LABEL[type]}`
              : `${PLATE_LABEL[type]} · ${Math.round(b.confidence * 100)}%`;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.box,
                {
                  borderColor: color,
                  left: b.x * size.w,
                  top: b.y * size.h,
                  width: b.w * size.w,
                  height: b.h * size.h,
                },
              ]}
            >
              <View style={[styles.boxLabel, { backgroundColor: color }]}>
                <Text style={styles.boxLabelText}>{label}</Text>
              </View>
            </View>
          );
        })}

      {/* Guía central cuando aún no hay detección. */}
      {boxes.length === 0 && (
        <View style={styles.center} pointerEvents="none">
          <View style={styles.frame}>
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
          </View>
          <Text style={styles.hint}>
            {!detector.ready
              ? 'Cargando modelo…'
              : !initialized
                ? 'Iniciando cámara…'
                : 'Apuntá a la placa'}
          </Text>
        </View>
      )}

      {/* Estado del detector + placa leída. */}
      <View style={styles.status} pointerEvents="none">
        {!detector.ready && !detector.error && <ActivityIndicator color="#FFF" />}
        {detector.error && (
          <Text style={styles.statusErr}>Modelo no disponible: {detector.error}</Text>
        )}
        {detector.ready && boxes.length > 0 && plateRead?.plate && (
          <Animated.View style={[styles.plateCard, cardStyle, { borderColor: TYPE_COLOR[plateRead.type] }]}>
            <VehicleArt type={plateRead.type} size={56} />
            <View style={styles.plateInfo}>
              <Text style={styles.plateText}>{plateRead.plate}</Text>
              <Text style={[styles.plateType, { color: TYPE_COLOR[plateRead.type] }]}>
                {PLATE_LABEL[plateRead.type].toUpperCase()}
              </Text>
            </View>
          </Animated.View>
        )}
        {detector.ready && boxes.length > 0 && !plateRead?.plate && (
          <Text
            style={[
              styles.statusOk,
              { backgroundColor: TYPE_COLOR[boxes[0].type ?? 'desconocido'] },
            ]}
          >
            Leyendo placa…
          </Text>
        )}
        {savedFlash && <Text style={styles.savedFlash}>✓ Guardada en el historial</Text>}
      </View>
    </View>
  );
}

function Fallback({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Screen center>
      <GlassCard style={styles.fallbackCard}>
        <CameraOff size={40} color={colors.mutedForeground} />
        <Text style={[styles.fallbackTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.fallbackMsg, { color: colors.mutedForeground }]}>{message}</Text>
        {actionLabel && onAction && (
          <GlassButton intensity="clear" label={actionLabel} onPress={onAction} style={styles.fallbackBtn} />
        )}
      </GlassCard>
    </Screen>
  );
}

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const map: Record<typeof pos, object> = {
    tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: Radius.md },
    tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: Radius.md },
    bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: Radius.md },
    br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: Radius.md },
  };
  return <View style={[styles.corner, map[pos]]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  frame: { width: 300, height: 190, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#FFFFFF' },
  hint: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  box: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#34D399',
    borderRadius: Radius.sm,
  },
  boxLabel: {
    position: 'absolute',
    top: -24,
    left: -3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  boxLabelText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  status: { position: 'absolute', bottom: 110, left: 0, right: 0, alignItems: 'center', gap: 8 },
  statusErr: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  statusOk: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(52,211,153,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  plateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 2,
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 22,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
  plateInfo: { alignItems: 'flex-start' },
  plateText: { fontSize: 26, fontWeight: '900', letterSpacing: 3, color: '#0F172A' },
  plateType: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  savedFlash: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(16,185,129,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fallbackCard: { padding: Spacing.five, alignItems: 'center', gap: Spacing.three, maxWidth: 340 },
  fallbackTitle: { fontSize: 20, fontWeight: '700' },
  fallbackMsg: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  fallbackBtn: { alignSelf: 'stretch', marginTop: Spacing.two },
});
