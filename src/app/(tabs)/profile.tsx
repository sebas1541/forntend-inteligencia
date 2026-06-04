import { useFocusEffect, useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Clock,
  ExternalLink,
  LogOut,
  Mail,
  ScanLine,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Screen } from '@/components/ui/screen';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { api, type Plate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { withAlpha } from '@/utils/color';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, token, loading, signOut } = useAuth();

  const [plates, setPlates] = useState<Plate[]>([]);

  // Invitados → modal de login (sin pantalla placeholder).
  useFocusEffect(
    useCallback(() => {
      if (!loading && !user) {
        const id = setTimeout(() => router.push('/(auth)/login'), 0);
        return () => clearTimeout(id);
      }
    }, [loading, user]),
  );

  useFocusEffect(
    useCallback(() => {
      if (token) api.listPlates(token).then(setPlates).catch(() => {});
    }, [token]),
  );

  if (loading || !user) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return <AuthenticatedProfile user={user} plates={plates} onLogout={() => void signOut()} />;
}

function AuthenticatedProfile({
  user,
  plates,
  onLogout,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  plates: Plate[];
  onLogout: () => void;
}) {
  const router = useRouter();
  const colors = useThemeColors();
  const [infoModal, setInfoModal] = useState<'help' | 'privacy' | null>(null);

  const stats = useMemo(() => {
    const carros = plates.filter((p) => p.plate_type === 'carro' || p.plate_type === 'particular').length;
    const motos = plates.filter((p) => p.plate_type === 'moto').length;
    return { total: plates.length, carros, motos };
  }, [plates]);

  const name = user.full_name?.trim() || user.email.split('@')[0];

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Perfil</Text>
          <Pressable
            accessibilityLabel="Notificaciones"
            style={[styles.bell, { backgroundColor: colors.muted }]}
          >
            <Bell size={18} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Tarjeta resumen: avatar + stats (layout de koen) */}
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryLeft}>
            <View>
              <Avatar uri={user.avatar_url} name={name} size={96} />
              <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <ShieldCheck size={14} color="#FFFFFF" />
              </View>
            </View>
            <Text style={[styles.summaryName, { color: colors.foreground }]} numberOfLines={1}>
              {name.split(' ')[0]}
            </Text>
            <Text style={[styles.summaryEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
              {user.email}
            </Text>
          </View>

          <View style={styles.summaryRight}>
            <StatLine value={stats.total} label="Placas" />
            <View style={[styles.statDivider, { backgroundColor: colors.muted }]} />
            <StatLine value={stats.carros} label="Carros" />
            <View style={[styles.statDivider, { backgroundColor: colors.muted }]} />
            <StatLine value={stats.motos} label="Motos" />
          </View>
        </View>

        {/* Accesos rápidos */}
        <View style={styles.tiles}>
          <ActionTile
            label="Historial"
            sublabel={`${stats.total} placas`}
            icon={<Clock size={28} color={colors.primary} />}
            onPress={() => router.navigate('/history')}
          />
          <ActionTile
            label="Escanear"
            sublabel="Nueva placa"
            icon={<ScanLine size={28} color={colors.primary} />}
            onPress={() => router.navigate('/scanner')}
          />
        </View>

        <View style={[styles.divider, { borderTopColor: colors.border }]} />

        <MenuItem
          icon={<Settings size={22} color={colors.foreground} />}
          label="Configuración de cuenta"
          onPress={() => Alert.alert('Configuración de cuenta', 'Próximamente.')}
        />
        <MenuItem
          icon={<CircleHelp size={22} color={colors.foreground} />}
          label="Ayuda"
          onPress={() => setInfoModal('help')}
        />
        <MenuItem
          icon={<ShieldCheck size={22} color={colors.foreground} />}
          label="Privacidad"
          onPress={() => setInfoModal('privacy')}
        />

        <View style={[styles.divider, { borderTopColor: colors.border }]} />

        <MenuItem
          icon={<LogOut size={22} color="#EF4444" />}
          label="Cerrar sesión"
          danger
          onPress={onLogout}
        />
      </ScrollView>

      <InfoModal kind={infoModal} onClose={() => setInfoModal(null)} />
    </SafeAreaView>
  );
}

function StatLine({ value, label }: { value: number; label: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.statLine}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ActionTile({
  label,
  sublabel,
  icon,
  onPress,
}: {
  label: string;
  sublabel: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {icon}
      <Text style={[styles.tileLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.tileSub, { color: colors.mutedForeground }]}>{sublabel}</Text>
    </Pressable>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.muted }]}
    >
      <View style={styles.menuIcon}>{icon}</View>
      <Text
        style={[
          styles.menuLabel,
          { color: danger ? '#EF4444' : colors.foreground, fontWeight: danger ? '700' : '500' },
        ]}
      >
        {label}
      </Text>
      {!danger && <ChevronRight size={18} color={colors.border} />}
    </Pressable>
  );
}

function InfoModal({ kind, onClose }: { kind: 'help' | 'privacy' | null; onClose: () => void }) {
  const colors = useThemeColors();
  if (!kind) return null;
  const isHelp = kind === 'help';
  const Icon = isHelp ? CircleHelp : ShieldCheck;
  const title = isHelp ? 'Ayuda y soporte' : 'Política de privacidad';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHandleWrap}>
            <View style={[styles.modalHandle, { backgroundColor: colors.mutedForeground }]} />
          </View>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
                <Icon size={20} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={[styles.modalClose, { backgroundColor: colors.muted }]}>
              <X size={16} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            {isHelp ? (
              <>
                <Text style={[styles.modalText, { color: colors.mutedForeground }]}>
                  ¿Necesitas ayuda con el escaneo o tu cuenta? Escríbenos y te respondemos lo antes posible.
                </Text>
                <View style={[styles.modalRow, { backgroundColor: colors.muted }]}>
                  <Mail size={18} color={colors.foreground} />
                  <Text style={[styles.modalRowText, { color: colors.foreground }]}>soporte@quickplate.app</Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL('https://github.com/sebas1541').catch(() => {})}
                  style={[styles.modalLink, { backgroundColor: withAlpha(colors.primary, 0.1), borderColor: withAlpha(colors.primary, 0.3) }]}
                >
                  <ExternalLink size={18} color={colors.primary} />
                  <Text style={[styles.modalRowText, { color: colors.foreground }]}>Repositorio del proyecto</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.modalText, { color: colors.mutedForeground }]}>
                  En QuickPlate todo el procesamiento (detección y lectura de la placa) ocurre en tu
                  dispositivo. Al servidor solo se guarda el texto de la placa, el tipo y la ubicación
                  que tú escaneas, y nunca se comparten con terceros.
                </Text>
                <Text style={[styles.modalText, { color: colors.mutedForeground }]}>
                  Puedes eliminar cualquier placa de tu historial cuando quieras.
                </Text>
                <View style={[styles.modalRow, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.modalSmall, { color: colors.mutedForeground }]}>
                    Última actualización: junio 2026
                  </Text>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerRow: {
    height: 56,
    paddingTop: 4,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 34, fontWeight: '900' },
  bell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  summary: {
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryLeft: { width: '50%', alignItems: 'center' },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryName: { marginTop: 12, fontSize: 18, fontWeight: '900' },
  summaryEmail: { marginTop: 2, fontSize: 12 },
  summaryRight: { flex: 1, justifyContent: 'space-around', paddingLeft: 16 },
  statLine: { paddingVertical: 4 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  statDivider: { height: 1, marginVertical: 2 },
  tiles: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginTop: 16 },
  tile: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tileLabel: { marginTop: 12, fontSize: 15, fontWeight: '700' },
  tileSub: { fontSize: 12, marginTop: 2 },
  divider: { marginHorizontal: 24, marginTop: 24, borderTopWidth: 1 },
  menuItem: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 32, alignItems: 'center' },
  menuLabel: { marginLeft: 12, flex: 1, fontSize: 16 },
  // InfoModal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingBottom: 34 },
  modalHandleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, opacity: 0.45 },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, gap: 12 },
  modalText: { fontSize: 14, lineHeight: 20 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13 },
  modalLink: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13 },
  modalRowText: { fontSize: 15, fontWeight: '700' },
  modalSmall: { fontSize: 12 },
});
