import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useThemeColors } from '@/hooks/use-theme-colors';

/**
 * iOS bottom bar: the real native UITabBar — on iOS 26 this renders as
 * liquid glass automatically, with shrink-on-scroll. SF Symbol icons.
 */
export default function TabsLayoutIOS() {
  const colors = useThemeColors();

  return (
    <NativeTabs tintColor={colors.primary} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} />
        <NativeTabs.Trigger.Label>Mapa</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="scanner">
        <NativeTabs.Trigger.Icon sf={{ default: 'viewfinder', selected: 'viewfinder' }} />
        <NativeTabs.Trigger.Label>Escanear</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} />
        <NativeTabs.Trigger.Label>Historial</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
