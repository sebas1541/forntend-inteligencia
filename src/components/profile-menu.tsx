import { MenuView, type NativeActionEvent } from '@react-native-menu/menu';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GlassCard } from '@/components/glass/glass-card';
import { Avatar } from '@/components/ui/avatar';
import { Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

const ACTION_SETTINGS = 'profile_settings';
const ACTION_LOGOUT = 'profile_logout';

/**
 * Header avatar pill (glass). Tap abre el menú nativo (PopupMenu/UIMenu). Como
 * el menú en modo tap no "levanta" la vista origen, emulamos ese morph: al abrir
 * el menú la foto del avatar se DESVANECE (opacity→0 con un leve lift) y reaparece
 * al cerrarlo, para que no quede el círculo flotando junto al menú.
 * Guests get a pill that opens the login modal.
 */
export function ProfileMenu() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Animación: el avatar se desvanece mientras el menú está abierto.
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const onOpen = () => {
    Haptics.selectionAsync().catch(() => {});
    scale.value = withTiming(1.08, { duration: 160 });
    opacity.value = withTiming(0, { duration: 160 });
  };
  const onClose = () => {
    opacity.value = withTiming(1, { duration: 180 });
    scale.value = withSpring(1, { damping: 14, stiffness: 220, mass: 0.7 });
  };

  const pill = (
    <GlassCard radius={Radius.pill} interactive style={styles.pill}>
      <View style={styles.pillInner}>
        <Avatar uri={user?.avatar_url} name={user?.full_name ?? user?.email} size={40} />
      </View>
    </GlassCard>
  );

  // Guest → tapping just opens the login modal.
  if (!user) {
    return (
      <Pressable onPress={() => router.push('/(auth)/login')} accessibilityLabel="Iniciar sesión">
        {pill}
      </Pressable>
    );
  }

  const onPressAction = ({ nativeEvent }: NativeActionEvent) => {
    if (nativeEvent.event === ACTION_SETTINGS) router.navigate('/profile');
    else if (nativeEvent.event === ACTION_LOGOUT) void signOut();
  };

  return (
    <MenuView
      title=""
      shouldOpenOnLongPress={false}
      onOpenMenu={onOpen}
      onCloseMenu={onClose}
      onPressAction={onPressAction}
      actions={[
        {
          id: ACTION_SETTINGS,
          title: 'Configuración de perfil',
          image: Platform.select({ ios: 'gearshape.fill' }),
        },
        {
          // Grupo inline → divisor + acción destructiva, como koen.
          id: 'profile_logout_group',
          title: '',
          displayInline: true,
          subactions: [
            {
              id: ACTION_LOGOUT,
              title: 'Cerrar sesión',
              attributes: { destructive: true },
              image: Platform.select({ ios: 'rectangle.portrait.and.arrow.right' }),
            },
          ],
        },
      ]}
    >
      <Animated.View style={pillStyle}>{pill}</Animated.View>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  pill: { width: 44, height: 44 },
  pillInner: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
