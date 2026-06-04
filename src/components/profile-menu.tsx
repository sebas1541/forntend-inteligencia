import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LogOut, Settings } from 'lucide-react-native';
import { type ReactNode, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/glass/glass-card';
import { Avatar } from '@/components/ui/avatar';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuth } from '@/lib/auth';

const MENU_WIDTH = 250;

type Anchor = { x: number; y: number; width: number; height: number };

/**
 * Header avatar pill (glass). Tapping opens a glass dropdown with
 * "Configuración de perfil" + "Cerrar sesión" (koen's profile menu).
 * Guests get a pill that opens the login modal.
 */
export function ProfileMenu() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user, signOut } = useAuth();

  const pillRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const pill = (
    <GlassCard radius={Radius.pill} interactive style={styles.pill}>
      <View style={styles.pillInner}>
        <Avatar name={user?.full_name ?? user?.email} size={40} />
      </View>
    </GlassCard>
  );

  if (!user) {
    return (
      <Pressable onPress={() => router.push('/(auth)/login')} accessibilityLabel="Iniciar sesión">
        {pill}
      </Pressable>
    );
  }

  const openMenu = () => {
    pillRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
      Haptics.selectionAsync().catch(() => {});
    });
  };

  const handle = (key: 'settings' | 'logout') => {
    setOpen(false);
    if (key === 'settings') router.navigate('/profile');
    else void signOut();
  };

  return (
    <>
      <Pressable ref={pillRef} onPress={openMenu} accessibilityRole="button" accessibilityLabel="Perfil">
        {pill}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {anchor && (
            <View
              style={[
                styles.menuWrap,
                {
                  top: anchor.y + anchor.height + 8,
                  left: Math.max(8, anchor.x + anchor.width - MENU_WIDTH),
                },
              ]}
            >
              <GlassCard radius={18} style={styles.surface}>
                <MenuRow
                  icon={<Settings size={18} color={colors.primary} />}
                  label="Configuración de perfil"
                  onPress={() => handle('settings')}
                />
                <View style={[styles.sep, { backgroundColor: colors.border }]} />
                <MenuRow
                  icon={<LogOut size={18} color={colors.destructive} />}
                  label="Cerrar sesión"
                  destructive
                  onPress={() => handle('logout')}
                />
              </GlassCard>
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <View
          style={[
            styles.row,
            { backgroundColor: pressed ? (destructive ? 'rgba(220,38,38,0.10)' : 'rgba(79,70,229,0.10)') : 'transparent' },
          ]}
        >
          <View style={styles.rowIcon}>{icon}</View>
          <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { width: 44, height: 44 },
  pillInner: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  backdrop: { flex: 1 },
  menuWrap: {
    position: 'absolute',
    width: MENU_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  surface: { paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, gap: 12 },
  rowIcon: { width: 32, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600', letterSpacing: 0.2, flex: 1 },
  sep: { height: 1, marginHorizontal: 12, marginVertical: 4 },
});
