import { useAuth } from '@/lib/auth';

/**
 * "Continuar con Google".
 *
 * El flujo real (useIdTokenAuthRequest + manejo del redirect + intercambio del
 * código) vive en el AuthProvider (`src/lib/auth.tsx`), que está montado durante
 * toda la vida de la app. Esto es a propósito: el redirect de OAuth hace que
 * expo-router intente navegar, y si el manejador viviera en la pantalla de login
 * se desmontaría antes de completar el login. Aquí solo exponemos la misma API
 * que ya consumía la UI.
 */
export function useGoogleSignIn() {
  const { googleReady, googleBusy, googleError, promptGoogle } = useAuth();
  return {
    ready: googleReady,
    busy: googleBusy,
    error: googleError,
    prompt: promptGoogle,
  };
}
