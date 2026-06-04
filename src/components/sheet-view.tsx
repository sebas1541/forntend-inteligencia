import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/use-theme-colors';

/**
 * Wrapper para pantallas presentadas como modal sheet (igual que koen).
 *
 * iOS — usa el `presentation: 'modal'` nativo del Stack padre (pageSheet real:
 * esquinas redondeadas, backdrop del sistema, swipe-down). Aquí es solo un View
 * con fondo de tarjeta.
 *
 * Android — el `presentation: 'modal'` de Android es pantalla completa sin peek,
 * así que sintetizamos el look de iOS: backdrop oscuro (la ruta previa sigue
 * montada por `transparentModal`), tap en el backdrop = cerrar, y la hoja con
 * esquinas superiores redondeadas debajo del status bar + 16px de peek.
 */
export function SheetView({ children }: { children: ReactNode }) {
  const colors = useThemeColors();

  if (Platform.OS === 'ios') {
    return <View style={[styles.fill, { backgroundColor: colors.card }]}>{children}</View>;
  }
  return <AndroidSheet>{children}</AndroidSheet>;
}

function AndroidSheet({ children }: { children: ReactNode }) {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const peek = insets.top + 16;

  return (
    <View style={styles.backdrop}>
      <StatusBar style="light" />
      <Pressable
        accessibilityLabel="Cerrar"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{ height: peek }}
      />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
});
