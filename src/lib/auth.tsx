import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { api, type User } from './api';

const TOKEN_KEY = 'quickplate.token';

interface AuthState {
  user: User | null;
  token: string | null;
  /** True while restoring the saved session on startup. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function persist(accessToken: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    const me = await api.me(accessToken);
    setToken(accessToken);
    setUser(me);
  }

  const value: AuthState = {
    user,
    token,
    loading,
    signIn: async (email, password) => {
      const t = await api.login(email, password);
      await persist(t.access_token);
    },
    signUp: async (email, password) => {
      const t = await api.register(email, password);
      await persist(t.access_token);
    },
    signOut: async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
