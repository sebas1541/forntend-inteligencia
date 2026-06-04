import { useColorScheme } from 'react-native';

import { Colors, type ThemeColors } from '@/constants/theme';

/**
 * Read the current theme's color tokens. Use for inline styles, lucide icon
 * `color` props, ActivityIndicator, SVG fills, status bar, etc.
 */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return Colors[scheme];
}

/** Cheap predicate when you only need to branch on dark vs light. */
export function useIsDarkMode(): boolean {
  return useColorScheme() === 'dark';
}
