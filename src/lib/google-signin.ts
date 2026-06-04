import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/lib/auth';

// Required so the auth popup can hand control back to the app.
WebBrowser.maybeCompleteAuthSession();

// En Android, el redirect de OAuth debe usar un scheme que expo-router NO enrute
// (si no, atrapa `quickplate://oauthredirect` como ruta -> "Unmatched Route" y el
// código nunca se intercambia). Usamos el client ID de Android *invertido*
// (com.googleusercontent.apps.<id>), que registramos como intent-filter aparte en
// el manifest (ver app.config.ts -> android.intentFilters). Así el navegador
// interno captura el redirect y completa el login sin que expo-router interfiera.
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const androidRedirectUri =
  Platform.OS === 'android' && androidClientId
    ? `com.googleusercontent.apps.${androidClientId.replace('.apps.googleusercontent.com', '')}:/oauth2redirect`
    : undefined;

/**
 * "Continuar con Google" flow: opens Google's sign-in, gets an ID token, and
 * exchanges it with our backend (/auth/google) via the auth context.
 * Client IDs come from EXPO_PUBLIC_GOOGLE_* env vars (see .env.example).
 */
export function useGoogleSignIn() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Client IDs por plataforma (se incrustan en build desde .env / EXPO_PUBLIC_*).
  // Android requiere su propio client ID (tipo Android: package + SHA-1).
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // iOS funciona con el redirect por defecto; en Android forzamos el scheme
    // invertido para que expo-router no robe el callback.
    ...(androidRedirectUri ? { redirectUri: androidRedirectUri } : {}),
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (!idToken) {
        setError('Google no devolvió un token');
        return;
      }
      setBusy(true);
      setError(undefined);
      signInWithGoogle(idToken)
        .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo iniciar con Google'))
        .finally(() => setBusy(false));
    } else if (response.type === 'error') {
      setError('No se pudo iniciar con Google');
    }
  }, [response, signInWithGoogle]);

  return {
    /** True once the client IDs are configured and the request is built. */
    ready: !!request,
    busy,
    error,
    prompt: () => promptAsync(),
  };
}
