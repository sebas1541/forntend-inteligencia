import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

export default function AuthLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Android usa transparentModal → fondo transparente para que el
        // SheetView deje ver el backdrop oscuro sobre el mapa.
        contentStyle: {
          backgroundColor: Platform.OS === 'android' ? 'transparent' : colors.background,
        },
      }}
    />
  );
}
