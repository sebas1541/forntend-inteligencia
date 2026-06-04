import type { ConfigContext, ExpoConfig } from 'expo/config';

// Google Maps key comes from the environment (.env) so it never lives in the
// committed config. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env (see .env.example).
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'QuickPlate',
  slug: config.slug ?? 'quickplate',
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey,
    },
  },
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: googleMapsApiKey },
    },
  },
});
