import { Tabs } from 'expo-router';
import { Clock, House, ScanLine, User as UserIcon } from 'lucide-react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

/** Android/web bottom bar: themed JS tabs with lucide icons + haptics. */
export default function TabsLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <House size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="scanner"
        options={{ title: 'Escanear', tabBarIcon: ({ color }) => <ScanLine size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Historial', tabBarIcon: ({ color }) => <Clock size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <UserIcon size={24} color={color} /> }}
      />
    </Tabs>
  );
}
