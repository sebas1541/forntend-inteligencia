import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type ViewProps, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { withAlpha } from '@/utils/color';

interface Props extends ViewProps {
  /** Glass intensity on iOS. Ignored on the fallback. */
  intensity?: 'clear' | 'regular';
  /** Glass reacts to touch/scroll (iOS only). */
  interactive?: boolean;
  radius?: number;
}

/**
 * Frosted "liquid glass" surface. Renders a native glass effect on iOS 26+,
 * and a near-opaque themed card everywhere else (Android, older iOS).
 */
export function GlassCard({
  intensity = 'regular',
  interactive = false,
  radius = Radius.lg,
  style,
  children,
  ...rest
}: Props) {
  const colors = useThemeColors();

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle={intensity}
        isInteractive={interactive}
        style={[{ borderRadius: radius, overflow: 'hidden' }, style]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: withAlpha(colors.card, 0.92),
          borderRadius: radius,
          borderWidth: 1,
          borderColor: withAlpha(colors.border, 0.4),
          overflow: 'hidden',
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
