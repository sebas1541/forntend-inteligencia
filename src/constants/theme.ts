/**
 * Design tokens for QuickPlate.
 *
 * Mirrors the koen-mobile look: indigo-based palette, semantic light/dark
 * tokens, system fonts. Class-free — every screen/component reads these via
 * `useThemeColors()`. Adds a `plate` palette for the detection overlay
 * (moto / particular / publico), matching the colors used in the Python
 * classifier prototype.
 */
import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#FFFFFF',
    foreground: '#1E1B4B', // indigo-950 — dark navy text
    card: '#FFFFFF',
    cardForeground: '#1E1B4B',
    muted: '#E0E7FF', // indigo-100
    mutedForeground: '#737373',
    primary: '#4F46E5', // indigo-600
    primaryForeground: '#FFFFFF',
    accent: '#4F46E5',
    accentForeground: '#FFFFFF',
    border: '#A5B4FC', // indigo-300
    destructive: '#EF4444',
  },
  dark: {
    background: '#0F0F0F',
    foreground: '#F5F5F5',
    card: '#1C1C1C',
    cardForeground: '#F5F5F5',
    muted: '#292929',
    mutedForeground: '#A3A3A3',
    primary: '#818CF8', // indigo-400
    primaryForeground: '#FFFFFF',
    accent: '#A78BFA', // purple-400
    accentForeground: '#FFFFFF',
    border: '#383838',
    destructive: '#EF4444',
  },
} as const;

export type ThemeColor = keyof (typeof Colors)['light'];
export type ThemeColors = Record<ThemeColor, string>;

/**
 * Colors for each plate type drawn on the detection overlay. Kept aligned
 * with classify_prototype.py so the app and the Python prototype agree.
 */
export const PlateColors = {
  moto: '#F59E0B', // amber — amarilla + formato moto
  particular: '#FACC15', // yellow — amarilla
  publico: '#E5E7EB', // near-white — blanca
  desconocido: '#EF4444', // red
} as const;

export type PlateType = keyof typeof PlateColors;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const MaxContentWidth = 800;
