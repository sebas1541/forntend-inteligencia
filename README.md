# QuickPlate

App móvil (Expo / React Native) para lectura y clasificación de **placas vehiculares colombianas en tiempo real**, ejecutando la inferencia en el dispositivo.

Es el frontend del proyecto de detección de placas (detector YOLO11n + clasificador de tipo por color/OCR).

## Stack

- **Expo SDK 56** + **expo-router** (file-based routing) + TypeScript
- **expo-glass-effect** — efecto *liquid glass* nativo en iOS 26+, con fallback temático en Android / iOS anteriores
- **lucide-react-native** (íconos) + **react-native-svg** (logo)
- Sistema de diseño basado en `koen-mobile` (paleta índigo, tokens claro/oscuro, componentes de vidrio)

## Roadmap

1. ✅ **Scaffold + diseño** — app navegable con el look de vidrio, branding QuickPlate.
2. ⏳ **Cámara** — preview en vivo con `react-native-vision-camera` (+ dev client / prebuild).
3. ⏳ **Inferencia TFLite** — `react-native-fast-tflite` corriendo el detector sobre frames.
4. ⏳ **Overlay** — cajas de detección en vivo con Skia.
5. ⏳ **Clasificación** — color HSV + formato de placa (OCR vía ML Kit).

## Cómo correr

```bash
npm install
npx expo start
```

> A partir de la fase 2 (cámara), la app requiere un **development build** (`npx expo run:ios` / `run:android`), no Expo Go, porque usa módulos nativos (vision-camera, fast-tflite).

## Estructura

```
src/
├── app/                 # rutas (expo-router): index (home), scanner
├── components/
│   ├── glass/           # GlassCard, GlassButton (vidrio + fallback)
│   ├── ui/              # Screen y otros primitivos
│   └── quick-plate-logo.tsx
├── constants/theme.ts   # tokens de color, spacing, radios, tipos de placa
├── hooks/use-theme-colors.ts
└── utils/color.ts
```
