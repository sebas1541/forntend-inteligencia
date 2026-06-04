import { useFocusEffect, useRouter } from 'expo-router';
import { BarChart3, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/glass-button';
import { GlassCard } from '@/components/glass/glass-card';
import { Screen } from '@/components/ui/screen';
import { VehicleArt } from '@/components/vehicle-art';
import { Radius, Spacing, type PlateType } from '@/constants/theme';
import { useIsDarkMode, useThemeColors } from '@/hooks/use-theme-colors';
import { ApiError, api, type Plate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getCurrentCoords } from '@/lib/use-location';
import { withAlpha } from '@/utils/color';

const TYPE_OPTIONS: { key: PlateType; label: string }[] = [
  { key: 'particular', label: 'Particular' },
  { key: 'publico', label: 'Público' },
  { key: 'moto', label: 'Moto' },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function HistoryScreen() {
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const headerIcon = isDark ? '#FFFFFF' : colors.primary;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();

  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [plateText, setPlateText] = useState('');
  const [plateType, setPlateType] = useState<PlateType>('particular');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setPlates(await api.listPlates(token));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Guests can't have a history — bounce straight to the login modal.
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !token) {
        const id = setTimeout(() => router.push('/(auth)/login'), 0);
        return () => clearTimeout(id);
      }
    }, [authLoading, token]),
  );

  async function addPlate() {
    if (!token || !plateText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const coords = await getCurrentCoords();
      await api.createPlate(token, {
        plate: plateText.trim().toUpperCase(),
        plate_type: plateType,
        lat: coords?.latitude ?? null,
        lng: coords?.longitude ?? null,
      });
      setPlateText('');
      setPlateType('particular');
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la placa');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!token) return;
    setPlates((prev) => prev.filter((p) => p.id !== id));
    try {
      await api.deletePlate(token, id);
    } catch {
      void load();
    }
  }

  function confirmRemove(item: Plate) {
    Alert.alert(
      'Eliminar placa',
      `¿Eliminar ${item.plate} del historial? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void remove(item.id) },
      ],
    );
  }

  if (authLoading) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!token) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={plates}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.foreground }]}>Historial</Text>
              <Pressable
                onPress={() => setFormOpen((v) => !v)}
                hitSlop={10}
                accessibilityLabel="Agregar placa"
                style={[styles.headerBtn, { backgroundColor: colors.muted }]}
              >
                <Plus size={22} color={headerIcon} />
              </Pressable>
            </View>

            {formOpen && (
              <GlassCard style={styles.form}>
                <TextInput
                  value={plateText}
                  onChangeText={(t) => setPlateText(t.toUpperCase())}
                  placeholder="ABC123"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={16}
                  style={[
                    styles.input,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: withAlpha(colors.muted, 0.4) },
                  ]}
                />
                <View style={styles.chips}>
                  {TYPE_OPTIONS.map((t) => {
                    const active = plateType === t.key;
                    return (
                      <Pressable
                        key={t.key}
                        onPress={() => setPlateType(t.key)}
                        style={[
                          styles.chip,
                          { borderColor: colors.border },
                          active && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                      >
                        <Text style={{ color: active ? colors.primaryForeground : colors.foreground, fontWeight: '600' }}>
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <GlassButton
                  intensity="clear"
                  label="Guardar placa"
                  loading={saving}
                  disabled={!plateText.trim()}
                  onPress={addPlate}
                  style={styles.saveBtn}
                />
              </GlassCard>
            )}

            {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
          </View>
        }
        renderItem={({ item }) => {
          return (
            <GlassCard style={styles.item}>
              <Pressable
                style={styles.itemMain}
                onPress={() => router.push({ pathname: '/plate/[id]', params: { id: String(item.id) } })}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalle de ${item.plate}`}
              >
                <VehicleArt type={item.plate_type} size={40} />
                <View style={styles.itemBody}>
                  <Text style={[styles.itemPlate, { color: colors.foreground }]}>{item.plate}</Text>
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                    {item.plate_type} · {formatDateTime(item.created_at)}
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => confirmRemove(item)} hitSlop={10}>
                <Trash2 size={20} color={colors.mutedForeground} />
              </Pressable>
            </GlassCard>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              Aún no has registrado placas. Toca + para agregar una.
            </Text>
          ) : null
        }
      />

      {plates.length > 0 && (
        <Pressable
          onPress={() => router.push('/analytics')}
          accessibilityRole="button"
          accessibilityLabel="Análisis"
          style={[styles.fab, { bottom: insets.bottom + 84, backgroundColor: colors.primary }]}
        >
          <BarChart3 size={18} color={colors.primaryForeground} />
          <Text style={[styles.fabText, { color: colors.primaryForeground }]}>Análisis</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 24, paddingTop: Spacing.four, paddingBottom: 120, gap: Spacing.three },
  headerWrap: { gap: Spacing.three, marginBottom: Spacing.one },
  headerRow: {
    height: 56,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 34, fontWeight: '900' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { fontSize: 15, fontWeight: '800' },
  form: { padding: Spacing.three, gap: Spacing.three },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  chips: { flexDirection: 'row', gap: Spacing.two },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1 },
  saveBtn: { alignSelf: 'stretch' },
  error: { fontSize: 14, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  itemBody: { flex: 1, gap: 2 },
  itemPlate: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  itemMeta: { fontSize: 13, textTransform: 'capitalize' },
  empty: { textAlign: 'center', marginTop: Spacing.five, fontSize: 15, paddingHorizontal: Spacing.four, lineHeight: 22 },
  gateCard: { padding: Spacing.five, alignItems: 'center', gap: Spacing.three, maxWidth: 340 },
  gateTitle: { fontSize: 22, fontWeight: '700' },
  gateMsg: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  gateBtn: { alignSelf: 'stretch', marginTop: Spacing.two },
});
