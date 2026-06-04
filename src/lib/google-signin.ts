import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';

// Required so the auth popup can hand control back to the app.
WebBrowser.maybeCompleteAuthSession();

/**
 * "Continuar con Google" flow: opens Google's sign-in, gets an ID token, and
 * exchanges it with our backend (/auth/google) via the auth context.
 * Client IDs come from EXPO_PUBLIC_GOOGLE_* env vars (see .env.example).
 */
export function useGoogleSignIn() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
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
