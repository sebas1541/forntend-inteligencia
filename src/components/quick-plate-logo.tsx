import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { useThemeColors } from '@/hooks/use-theme-colors';

interface Props {
  /** Icon height in px. */
  size?: number;
  /** Plate color. Defaults to theme primary. */
  color?: string;
  /** Show the "QuickPlate" wordmark next to the icon. */
  showWordmark?: boolean;
}

/**
 * Placeholder QuickPlate mark: a license-plate glyph with three embossed
 * characters and mounting screws. Swap for final branding later.
 */
export function QuickPlateLogo({ size = 40, color, showWordmark = false }: Props) {
  const colors = useThemeColors();
  const plate = color ?? colors.primary;
  const w = size * 1.5; // 3:2 plate aspect

  return (
    <View style={styles.row}>
      <Svg width={w} height={size} viewBox="0 0 60 40">
        <Rect
          x={2.5}
          y={4.5}
          width={55}
          height={31}
          rx={6}
          fill="none"
          stroke={plate}
          strokeWidth={3.5}
        />
        <Circle cx={9} cy={11} r={1.6} fill={plate} />
        <Circle cx={51} cy={11} r={1.6} fill={plate} />
        <Rect x={15} y={17} width={6} height={13} rx={2} fill={plate} />
        <Rect x={27} y={17} width={6} height={13} rx={2} fill={plate} />
        <Rect x={39} y={17} width={6} height={13} rx={2} fill={plate} />
      </Svg>
      {showWordmark && (
        <Text style={[styles.wordmark, { color: colors.foreground }]}>
          Quick<Text style={{ color: plate }}>Plate</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
