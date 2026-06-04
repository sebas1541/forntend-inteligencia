import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle;
}

const SIZES: Record<Size, { height: number; paddingHorizontal: number; radius: number; font: number }> = {
  sm: { height: 36, paddingHorizontal: 12, radius: 8, font: 14 },
  md: { height: 48, paddingHorizontal: 16, radius: 12, font: 16 },
  lg: { height: 56, paddingHorizontal: 24, radius: 16, font: 18 },
};

export function Button({
  label,
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}: Props) {
  const colors = useThemeColors();
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.muted,
    outline: 'transparent',
    ghost: 'transparent',
    danger: colors.destructive,
  };
  const fg: Record<Variant, string> = {
    primary: colors.primaryForeground,
    secondary: colors.foreground,
    outline: colors.primary,
    ghost: colors.primary,
    danger: '#FFFFFF',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.radius,
          backgroundColor: bg[variant],
        },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.primary },
        fullWidth && { alignSelf: 'stretch' },
        pressed && (variant === 'outline' || variant === 'ghost'
          ? { backgroundColor: colors.muted }
          : { opacity: 0.9 }),
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : children ? (
        children
      ) : (
        <View style={styles.row}>
          {leftIcon}
          <Text style={[styles.label, { color: fg[variant], fontSize: s.font }]}>{label}</Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontWeight: '600' },
});
