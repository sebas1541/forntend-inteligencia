import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GlassButton } from '@/components/glass/glass-button';
import { GlassCard } from '@/components/glass/glass-card';
import { Screen } from '@/components/ui/screen';
import { PlateColors, Radius, Spacing, type PlateType } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ApiError, api, type Plate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { withAlpha } from '@/utils/color';

const TYPE_OPTIONS: { key: PlateType; label: string }[] = [
  { key: 'particular', label: 'Particular' },
  { key: 'publico', label: 'Público' },
  { key: 'moto', label: 'Moto' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

export default function HistoryScreen() {
  const colors = useThemeColors();
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

  async function addPlate() {
    if (!token || !plateText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createPlate(token, {
        plate: plateText.trim().toUpperCase(),
        plate_type: plateType,
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
        <GlassCard style={styles.gateCard}>
          <Text style={[styles.gateTitle, { color: colors.foreground }]}>Inicia sesión</Text>
          <Text style={[styles.gateMsg, { color: colors.mutedForeground }]}>
            Crea una cuenta o inicia sesión para guardar y ver las placas que registres.
          </Text>
          <GlassButton
            intensity="clear"
            label="Ir a Perfil"
            onPress={() => router.navigate('/profile')}
            style={styles.gateBtn}
          />
        </GlassCard>
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
              <Pressable onPress={() => setFormOpen((v) => !v)} hitSlop={10}>
                <GlassCard radius={Radius.pill} interactive style={styles.addBtn}>
                  <Plus size={22} color={colors.primary} />
                </GlassCard>
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
          const dotColor = PlateColors[item.plate_type as PlateType] ?? PlateColors.desconocido;
          return (
            <GlassCard style={styles.item}>
              <View style={[styles.itemDot, { backgroundColor: dotColor }]} />
              <View style={styles.itemBody}>
                <Text style={[styles.itemPlate, { color: colors.foreground }]}>{item.plate}</Text>
                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                  {item.plate_type} · {formatDate(item.created_at)}
                </Text>
              </View>
              <Pressable onPress={() => remove(item.id)} hitSlop={10}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.four, paddingBottom: 120, gap: Spacing.three },
  headerWrap: { gap: Spacing.three, marginBottom: Spacing.one },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: '800' },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  form: { padding: Spacing.three, gap: Spacing.three },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  chips: { flexDirection: 'row', gap: Spacing.two },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1 },
  saveBtn: { alignSelf: 'stretch' },
  error: { fontSize: 14, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  itemDot: { width: 14, height: 14, borderRadius: Radius.pill },
  itemBody: { flex: 1, gap: 2 },
  itemPlate: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  itemMeta: { fontSize: 13, textTransform: 'capitalize' },
  empty: { textAlign: 'center', marginTop: Spacing.five, fontSize: 15, paddingHorizontal: Spacing.four, lineHeight: 22 },
  gateCard: { padding: Spacing.five, alignItems: 'center', gap: Spacing.three, maxWidth: 340 },
  gateTitle: { fontSize: 22, fontWeight: '700' },
  gateMsg: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  gateBtn: { alignSelf: 'stretch', marginTop: Spacing.two },
});
