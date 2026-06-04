import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface Props {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  interactive?: boolean;
  intensity?: 'clear' | 'regular';
  /** Accent color: text color on glass, fill color on the fallback. */
  tintColor?: string;
  style?: ViewStyle;
}

/**
 * Pill action button. Frosted glass with tinted label on iOS 26+, solid
 * tinted pill with white label everywhere else.
 */
export function GlassButton({
  label,
  children,
  onPress,
  loading = false,
  disabled = false,
  interactive = true,
  intensity = 'regular',
  tintColor,
  style,
}: Props) {
  const colors = useThemeColors();
  const accent = tintColor ?? colors.primary;
  const isDisabled = disabled || loading;

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle={intensity}
        isInteractive={interactive && !isDisabled}
        style={[styles.glass, style, isDisabled && styles.disabled]}
      >
        <Pressable
          onPress={onPress}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled, busy: loading }}
          style={styles.pressable}
        >
          {loading ? (
            <ActivityIndicator color={accent} />
          ) : children ? (
            children
          ) : (
            <Text style={[styles.label, { color: accent }]}>{label}</Text>
          )}
        </Pressable>
      </GlassView>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.glass,
        styles.pressable,
        { backgroundColor: accent },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryForeground} />
      ) : children ? (
        children
      ) : (
        <Text style={[styles.label, { color: colors.primaryForeground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  pressable: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
