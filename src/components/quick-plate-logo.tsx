import { Image } from 'expo-image';
import { useColorScheme } from 'react-native';

// Full "QuickPlate" lockup (icon + wordmark), tight-cropped. Black wordmark
// for light backgrounds, white wordmark for dark backgrounds.
const LOGOS = {
  light: require('../../assets/images/logo-light.png'),
  dark: require('../../assets/images/logo-dark.png'),
};
const ASPECT = 2048 / 434; // ≈ 4.72

export function QuickPlateLogo({ height = 40 }: { height?: number }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <Image
      source={LOGOS[scheme]}
      style={{ height, aspectRatio: ASPECT }}
      contentFit="contain"
      transition={150}
      accessibilityLabel="QuickPlate"
    />
  );
}
