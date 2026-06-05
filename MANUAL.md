# QuickPlate — Manual de instalación y ejecución

Cómo correr la app **QuickPlate** en un iPhone o en Android, y por qué **no está
publicada en la App Store**.

---

## ⚠️ ¿Por qué no está en la App Store / Play Store?

Publicar una app de iOS en la **App Store** exige una cuenta del **Apple Developer
Program**, que cuesta **≈ 99 USD/año (≈ 400.000 COP)**. No contamos con esa cuenta
de pago, así que **la app no se puede subir a la App Store**.

Por eso QuickPlate se instala de forma **manual (sideload)**:

- **iPhone:** compilando la app con **Xcode** usando una **cuenta de Apple gratuita**
  (Personal Team). Funciona, pero la firma de una cuenta gratuita **caduca a los 7
  días** (hay que volver a compilar/instalar).
- **Android:** instalando directamente el archivo **`.apk`** (no requiere cuenta de
  pago; en Android sí se puede instalar fuera de la tienda).

El backend sí está desplegado en la nube (Railway), y la app ya apunta a él.

---

## 🍏 Ejecutar en iPhone (paso a paso, sin cuenta de pago)

### 1. Instalar Xcode y el SDK de iOS
1. Instala **Xcode** desde la Mac App Store (son varios GB).
2. Ábrelo una vez y **acepta las licencias**.
3. Instala los componentes/SDK de iOS:
   **Xcode → Settings → Components (o Platforms) → iOS → Get/Download.**
4. (Opcional, una sola vez) acepta la licencia por terminal:
   ```bash
   sudo xcodebuild -license accept
   ```

### 2. Preparar el proyecto
```bash
git clone https://github.com/sebas1541/forntend-inteligencia
cd forntend-inteligencia
npm install
# Crea el archivo .env (ver credentials.md con las llaves de Google/Maps/API)
npx expo prebuild           # genera la carpeta ios/ (y android/)
```

### 3. Activar el Modo Desarrollador en el iPhone
1. Conecta el iPhone al Mac por cable y "confía" en el equipo.
2. En el iPhone: **Settings → Privacy & Security → Developer Mode → ON**.
3. El teléfono **se reinicia** y pide confirmar que se active el Modo Desarrollador.

### 4. Firmar la app con tu cuenta (Team / Personal Team) en Xcode
1. Abre el proyecto en Xcode:
   ```bash
   open ios/QuickPlate.xcworkspace
   ```
2. En el navegador izquierdo selecciona el proyecto **QuickPlate** → pestaña
   **Signing & Capabilities**.
3. En **Team**, inicia sesión con tu **Apple ID** y elige tu
   **Personal Team (tu nombre)**.
4. Si Xcode marca el *Bundle Identifier* como no disponible, cámbialo por uno único
   (ej. `com.tunombre.quickplate`) para que la firma gratuita funcione.

### 5. Compilar e instalar en el iPhone
Desde la terminal:
```bash
npx expo run:ios --configuration Release --device
```
o desde Xcode: selecciona tu iPhone arriba y pulsa **▶ Run**.

> Si `pod install` falla por codificación, exporta el locale antes:
> `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`

### 6. Confiar en el certificado del desarrollador en el iPhone
La primera vez, iOS no confía en una app firmada con cuenta gratuita y no la deja
abrir. Hay que confiar el perfil:

**Settings → General → VPN & Device Management** (o "Gestión de dispositivos") →
toca tu **Apple ID** bajo "Developer App" → **Trust / Confiar**.

### 7. ¡Listo!
Abre **QuickPlate** desde la pantalla de inicio. Si a los ~7 días deja de abrir
(la firma gratuita expiró), repite el paso 5 para reinstalarla.

---

## 🤖 Ejecutar en Android

Mucho más simple (Android permite instalar fuera de la tienda):

**Opción A — instalar el APK ya compilado**
1. Pasa el archivo `QuickPlate-finalapk.apk` al teléfono (cable, Drive, etc.).
2. Ábrelo y permite **"Instalar apps de orígenes desconocidos"**.
3. Listo.

**Opción B — compilar tú mismo**
```bash
npx expo run:android                       # emulador o dispositivo conectado
# o un APK release instalable:
cd android && ./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk
```

> Para que **"Continuar con Google"** funcione en Android, el cliente OAuth de
> Android en Google Cloud debe tener activado **"Enable custom URI scheme"**
> (en *Advanced settings*).

---

## 🔑 Variables de entorno (`.env`)

La app necesita un archivo `.env` (no incluido en el repo por seguridad) con las
llaves de Google, Maps y la URL del backend. Los valores están documentados en el
archivo **`credentials.md`**. Sin él, no compila el login ni el mapa.

---

## 🧠 Nota técnica

Toda la visión por computador (detección con YOLO11n + OCR) corre **en el
dispositivo**; el backend (FastAPI, desplegado en Railway) solo guarda el historial
de placas de cada usuario. Ver el `README.md` para la arquitectura completa.
