import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { api, type User } from './api';

const TOKEN_KEY = 'quickplate.token';

// Permite que el popup de OAuth devuelva el control a la app.
WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: User | null;
  token: string | null;
  /** True while restoring the saved session on startup. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  // --- Google sign-in (vive aquí, en el provider persistente, para que el
  //     redirect de OAuth no desmonte el manejador al navegar) ---
  googleReady: boolean;
  googleBusy: boolean;
  googleError?: string;
  promptGoogle: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | undefined>();

  // Restore a saved token on startup and validate it.
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          const me = await api.me(saved);
          setToken(saved);
          setUser(me);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (accessToken: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    const me = await api.me(accessToken);
    setToken(accessToken);
    setUser(me);
  }, []);

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const t = await api.googleLogin(idToken);
      await persist(t.access_token);
    },
    [persist],
  );

  // El request de Google vive en el provider (montado durante toda la vida de la
  // app). Así, aunque el redirect haga que expo-router navegue, este hook NO se
  // desmonta y alcanza a intercambiar el código por el id_token.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        setGoogleError('Google no devolvió un token');
        return;
      }
      setGoogleBusy(true);
      setGoogleError(undefined);
      signInWithGoogle(idToken)
        .catch((e) =>
          setGoogleError(e instanceof Error ? e.message : 'No se pudo iniciar con Google'),
        )
        .finally(() => setGoogleBusy(false));
    } else if (response.type === 'error') {
      setGoogleError('No se pudo iniciar con Google');
    }
  }, [response, signInWithGoogle]);

  const value: AuthState = {
    user,
    token,
    loading,
    signIn: async (email, password) => {
      const t = await api.login(email, password);
      await persist(t.access_token);
    },
    signUp: async (email, password, fullName) => {
      const t = await api.register(email, password, fullName);
      await persist(t.access_token);
    },
    signInWithGoogle,
    signOut: async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      setUser(null);
    },
    googleReady: !!request,
    googleBusy,
    googleError,
    promptGoogle: () => {
      setGoogleError(undefined);
      promptAsync();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
