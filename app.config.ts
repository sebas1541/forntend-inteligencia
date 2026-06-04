import type { ConfigContext, ExpoConfig } from 'expo/config';

// Secrets/keys come from the environment (.env) so they never live in the
// committed config. See .env.example for the variables.
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

// The native iOS Google sign-in callback uses the reversed iOS client ID as a
// URL scheme; derive it so we don't hardcode it.
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const googleIosScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
  : undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'QuickPlate',
  slug: config.slug ?? 'quickplate',
  scheme: googleIosScheme ? ['quickplate', googleIosScheme] : (config.scheme ?? 'quickplate'),
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
