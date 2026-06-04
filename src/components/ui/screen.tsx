import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface Props {
  children: ReactNode;
  /** Which safe-area edges to inset. Defaults to all. */
  edges?: readonly Edge[];
  /** Center content vertically + horizontally. */
  center?: boolean;
  padded?: boolean;
  style?: ViewStyle;
}

/** Themed full-screen container with safe-area insets. */
export function Screen({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  center = false,
  padded = true,
  style,
}: Props) {
  const colors = useThemeColors();
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView
        edges={edges}
        style={[
          styles.fill,
          padded && styles.padded,
          center && styles.center,
          style,
        ]}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  padded: { paddingHorizontal: Spacing.four },
  center: { alignItems: 'center', justifyContent: 'center' },
});
