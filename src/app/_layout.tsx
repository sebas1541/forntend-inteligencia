import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';

/**
 * Presents the login modal when there's no session, and dismisses it on
 * successful auth. Mirrors koen's gate: auto-present once per launch; the
 * user can swipe-dismiss to browse, and actions that need auth re-open it.
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { token, loading } = useAuth();
  const autoPushed = useRef(false);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const authenticated = !!token;

    if (!authenticated && !inAuthGroup && !autoPushed.current) {
      autoPushed.current = true;
      const id = setTimeout(() => router.push('/(auth)/login'), 0);
      return () => clearTimeout(id);
    }
    if (authenticated && inAuthGroup) {
      autoPushed.current = false; // re-arm so a future logout re-presents login
      const id = setTimeout(() => router.replace('/(tabs)'), 0);
      return () => clearTimeout(id);
    }
  }, [loading, segments, token, router]);

  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: c.background,
      card: c.card,
      primary: c.primary,
      text: c.foreground,
      border: c.border,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider value={navTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: c.background },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="(auth)"
                options={{
                  presentation: 'modal',
                  animation: Platform.OS === 'android' ? 'slide_from_bottom' : undefined,
                  gestureEnabled: true,
                }}
              />
            </Stack>
            <AuthGate />
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
