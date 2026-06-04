# QuickPlate — App móvil

App móvil **Expo / React Native** para **detección, lectura y clasificación de
placas vehiculares colombianas en tiempo real**, ejecutando **toda la inferencia
en el dispositivo** (on-device). Proyecto del curso *Inteligencia Computacional*.

Es el frontend del proyecto de placas:

- **Detección** con un modelo **YOLO11n** (`.tflite`) propio que corre on-device.
- **OCR** del recorte de la placa con un **módulo nativo** (Apple Vision en iOS,
  ML Kit en Android).
- **Clasificación de tipo** (carro / moto / público) por color + formato.
- **Historial, mapa, perfil y analítica**, sincronizados con la
  [API QuickPlate](https://github.com/sebas1541/inteligencia-backend).

> Nada de imágenes sale del teléfono: el detector y el OCR son locales. La API solo
> guarda los datos de las placas registradas.

---

## Tabla de contenido

- [1. Stack](#1-stack)
- [2. Pipeline de visión (on-device)](#2-pipeline-de-visión-on-device)
- [3. Funcionalidades](#3-funcionalidades)
- [4. Navegación (expo-router)](#4-navegación-expo-router)
- [5. Estructura del repositorio](#5-estructura-del-repositorio)
- [6. Configuración (.env)](#6-configuración-env)
- [7. Cómo correr](#7-cómo-correr)
- [8. Builds de producción](#8-builds-de-producción)
- [9. Diseño](#9-diseño)

---

## 1. Stack

| Capa | Tecnología | Nota |
|------|-----------|------|
| Framework | **Expo SDK 56** + **React Native 0.85** | New Architecture (Fabric) |
| Routing | **expo-router** (file-based) | typed routes |
| Lenguaje | **TypeScript** | |
| Cámara | **react-native-vision-camera** 4.7 | snapshot loop (`takePhoto`) |
| Inferencia | **react-native-fast-tflite** 3.0 | Nitro; corre el YOLO11n `.tflite` |
| Procesamiento de imagen | **@shopify/react-native-skia** 2.6 | crop/escala a 416, RGB Float32, charts |
| OCR | **módulo nativo Expo `plate-ocr`** | Apple Vision (iOS) · ML Kit (Android) |
| Mapas | **react-native-maps** 1.27 | Google provider, clustering + spiderfy |
| Animación | **react-native-reanimated** 4 + **worklets** | charts, spiderfy, transiciones |
| UI vidrio | **expo-glass-effect** | *liquid glass* iOS 26+ con fallback temático |
| Menús nativos | **@react-native-menu/menu** | menú de perfil (UIMenu / PopupMenu) |
| Bottom sheet | **@gorhom/bottom-sheet** 5 | panel "Tus escaneos" en el mapa |
| Iconos / SVG | **lucide-react-native** · **react-native-svg** | |
| Auth | **expo-auth-session** + **expo-secure-store** | Google Sign-In + token seguro |
| Ubicación | **expo-location** | dónde se escaneó la placa |

---

## 2. Pipeline de visión (on-device)

Todo vive en `src/lib/plate-detect/` + `modules/plate-ocr/`:

1. **Captura** — `scanner.tsx` corre un *snapshot loop* con vision-camera
   (`takePhoto`), con *gating* por `onInitialized` y manejo de `AppState` para
   evitar el error `-11803` cuando iOS suspende la cámara.
2. **Detección** (`use-detector.ts`) — Skia decodifica la foto, la recorta/escala a
   **416×416**, arma el `Float32` RGB y ejecuta `model.run([buffer])` con el
   `.tflite` (`assets/model/placa_detector.tflite`).
3. **Decodificación** (`decode.ts`) — interpreta el tensor `[1,5,3549]`, aplica
   **NMS** (`conf 0.4` / `IoU 0.45`) y clasifica el tipo (color HSV + aspecto).
4. **OCR** (`ocr.ts` → `modules/plate-ocr`) — recorta la placa a JPEG base64 y llama
   `recognizeText()` (Vision/ML Kit), luego aplica el **guard de 6 caracteres**
   (formato `LLLNNN` carro / `LLLNNL` moto, con corrección de confusiones de OCR).
5. **Auto-guardado** — la placa válida se guarda en el historial vía
   `api.createPlate` (placa, tipo, color, confianza, lat/lng, fecha).

El módulo nativo `plate-ocr` (`modules/plate-ocr/`) es un **Expo native module**
propio con implementación en **Swift (Vision)** y **Kotlin (ML Kit)** — se hizo a
medida para evitar conflictos de toolchain (GoogleMLKit / SwiftUICore en Xcode 26).

---

## 3. Funcionalidades

- **Escáner en vivo** — detección + OCR + clasificación, con tarjeta de resultado
  animada y muñequito del vehículo.
- **Historial** — lista de placas escaneadas; tarjetas tappables → modal de detalle.
- **Detalle de placa** — hero del vehículo, pill de tipo, datos, **mini-mapa**
  (tint por tema + tap → Google Maps), **edición** de placa/tipo y borrado con
  confirmación nativa.
- **Mapa** — todas las placas geolocalizadas con **clustering** (badge con número) y
  **spiderfy animado** (fan-out); panel "Tus escaneos"; botón de centrar que se
  adapta al tema y se oculta al expandir el panel.
- **Perfil** — resumen con avatar (foto de Google), estadísticas (placas / carros /
  motos), accesos y menú nativo.
- **Analítica** — dashboard con **gráficos animados** (donut por tipo, barras de los
  últimos 7 días), top de ubicaciones y **exportación a CSV**.
- **Auth** — registro / login email+contraseña y **Continuar con Google**.
- **Tema claro/oscuro**, ícono de app y **splash temático** que se desvanece al cargar.

---

## 4. Navegación (expo-router)

```
src/app/
├── _layout.tsx          · root: AuthGate, splash, modales (plate/[id], analytics)
├── (auth)/              · login, register, password (flujo de autenticación)
├── (tabs)/              · index (mapa), scanner, history, profile
├── plate/[id].tsx       · modal de detalle/edición de una placa
└── analytics.tsx        · dashboard de análisis (modal)
```

---

## 5. Estructura del repositorio

```
src/
├── app/                       · rutas (ver §4)
├── components/
│   ├── glass/                 · GlassCard, GlassButton (vidrio + fallback)
│   ├── ui/                    · avatar, button, input, screen
│   ├── cluster-marker.tsx     · marcador de cluster (círculo con conteo)
│   ├── plate-marker.tsx       · marcador individual de placa
│   ├── profile-menu.tsx       · menú nativo del perfil (@react-native-menu/menu)
│   ├── sheet-view.tsx         · sheet estilo koen (card iOS / backdrop Android)
│   ├── vehicle-art.tsx        · muñequito según tipo (carro/moto/van)
│   └── quick-plate-logo.tsx · google-logo.tsx
├── lib/
│   ├── api.ts                 · cliente HTTP de la API (auth + plates)
│   ├── auth.tsx               · contexto de autenticación + token seguro
│   ├── config.ts              · API_BASE_URL (EXPO_PUBLIC_API_URL o LAN)
│   ├── google-signin.ts       · flujo de Google Sign-In
│   ├── cluster.ts · geo.ts    · clustering y utilidades geográficas
│   ├── use-location.ts        · hook de ubicación
│   └── plate-detect/          · decode.ts, use-detector.ts, ocr.ts (pipeline §2)
├── constants/                 · theme.ts (tokens claro/oscuro), map-styles.ts
├── hooks/use-theme-colors.ts
└── utils/color.ts

modules/plate-ocr/             · módulo nativo de OCR
├── index.ts · src/PlateOcrModule.ts
├── ios/PlateOcrModule.swift   · Apple Vision (VNRecognizeTextRequest)
├── ios/PlateOcr.podspec
└── android/.../PlateOcrModule.kt · ML Kit text-recognition

assets/model/placa_detector.tflite   · detector YOLO11n exportado (fp16)
```

---

## 6. Configuración (.env)

Variables `EXPO_PUBLIC_*` (se incrustan **en tiempo de compilación**). El `.env`
real está **gitignored**:

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL del backend (Railway). Si falta, en dev cae al host de Metro en `:8000` (LAN) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | API key de Google Maps |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | OAuth client iOS |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | OAuth client Web |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | OAuth client Android |

`src/lib/config.ts` resuelve la base URL: usa `EXPO_PUBLIC_API_URL` si está
definida (builds de producción), si no apunta a la máquina que corre Metro en la
LAN (desarrollo con teléfono físico).

---

## 7. Cómo correr

```bash
npm install
npx expo start          # solo para JS; la app necesita un dev/release build nativo
```

> La app usa **módulos nativos** (vision-camera, fast-tflite, maps, el módulo OCR),
> así que **no funciona en Expo Go**: hay que hacer un *development build* o un
> *release build*.

**Development build (con Metro):**
```bash
npx expo run:ios            # simulador o dispositivo
npx expo run:android        # emulador o dispositivo
```

---

## 8. Builds de producción

Para una app **standalone** (sin Metro, apuntando al backend en la nube), primero
define `EXPO_PUBLIC_API_URL` en `.env` y reconstruye (las `EXPO_PUBLIC_*` se
incrustan al compilar):

**iOS (Release):**
```bash
npx expo run:ios --configuration Release --device
```

**Android (APK Release instalable):**
```bash
cd android && ./gradlew assembleRelease
# salida: android/app/build/outputs/apk/release/app-release.apk
```

> El APK Release queda firmado con la *debug key* del template de Expo → instalable
> en cualquier dispositivo para pruebas (no apto para Play Store sin keystore propio).

`app.json` registra los plugins nativos: `expo-router`, `expo-splash-screen`,
`react-native-vision-camera`, `expo-secure-store`, `react-native-fast-tflite`,
`expo-location` y un plugin propio para el podspec de Google Maps.

---

## 9. Diseño

El sistema de diseño está replicado del proyecto propio **`koen-mobile`**: paleta
**índigo**, estética *liquid glass*, tokens de color claro/oscuro y componentes de
vidrio. Colores de acento por tipo de placa (fuente única en
`src/lib/plate-detect/decode.ts`): **carro = morado `#4F46E5`**,
**moto = rojo `#EF4444`**, **público = ámbar `#F59E0B`**.

---

**Autores** — Universidad Pedagógica y Tecnológica de Colombia (UPTC), Tunja —
proyecto del curso *Inteligencia Computacional*:

- **Sebastián Cañón Castellanos** (cód. 202127352) — *autor principal*.
- Kevin Johann Jiménez Poveda (cód. 202220120).
- Pedro Eduardo Cruz López (cód. 202128778).

Repos relacionados: `inteligencia-computacional-proyecto` (modelo ML) ·
`inteligencia-backend` (API FastAPI).
