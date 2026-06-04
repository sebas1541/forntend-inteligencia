import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Hash, MapPin, Pencil, Tag, Trash2 } from 'lucide-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { SheetView } from '@/components/sheet-view';
import { VehicleArt } from '@/components/vehicle-art';
import { MAP_STYLE_DARK, MAP_STYLE_LIGHT } from '@/constants/map-styles';
import { useIsDarkMode, useThemeColors } from '@/hooks/use-theme-colors';
import { api, type Plate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { withAlpha } from '@/utils/color';

const TYPE_COLOR: Record<string, string> = {
  carro: '#16A34A',
  particular: '#16A34A',
  moto: '#4F46E5',
  publico: '#334155',
  desconocido: '#6B7280',
};
const TYPE_LABEL: Record<string, string> = {
  carro: 'Carro',
  particular: 'Carro particular',
  moto: 'Moto',
  publico: 'Público',
  desconocido: 'Placa',
};
const colorFor = (t: string) => TYPE_COLOR[t] ?? '#6B7280';
const labelFor = (t: string) => TYPE_LABEL[t] ?? 'Placa';

// Opciones de tipo al editar (con su muñequito).
const EDIT_TYPES = [
  { key: 'carro', label: 'Carro' },
  { key: 'moto', label: 'Moto' },
  { key: 'publico', label: 'Público' },
] as const;

function patternFor(type: string): string {
  if (type === 'moto') return '3 letras + 2 números + 1 letra';
  if (type === 'publico') return 'Servicio público (placa blanca)';
  return '3 letras + 3 números';
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PlateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const { token } = useAuth();

  const [plate, setPlate] = useState<Plate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editPlate, setEditPlate] = useState('');
  const [editType, setEditType] = useState<string>('carro');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!plate) return;
    setEditPlate(plate.plate);
    setEditType(plate.plate_type);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!token || !plate) return;
    const next = editPlate.trim().toUpperCase();
    if (!next) return;
    setSaving(true);
    try {
      const updated = await api.updatePlate(token, plate.id, { plate: next, plate_type: editType });
      setPlate(updated);
      setEditing(false);
    } catch {
      setError('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token || !id) {
        setLoading(false);
        return;
      }
      try {
        const p = await api.getPlate(token, Number(id));
        if (alive) setPlate(p);
      } catch {
        if (alive) setError('No se pudo cargar la placa');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, id]);

  const onDelete = async () => {
    if (!token || !plate) return;
    try {
      await api.deletePlate(token, plate.id);
    } catch {
      /* ignore */
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!plate) return;
    Alert.alert(
      'Eliminar placa',
      `¿Eliminar ${plate.plate} del historial? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void onDelete() },
      ],
    );
  };

  const displayType = editing ? editType : plate?.plate_type ?? 'desconocido';
  const accent = plate ? colorFor(displayType) : colors.primary;

  return (
    <SheetView>
      {/* Acciones superiores (volver / editar / eliminar) */}
      <View style={styles.topActions} pointerEvents="box-none">
        <CircleButton onPress={() => (editing ? setEditing(false) : router.back())} label="Volver">
          <ArrowLeft size={20} color={colors.foreground} strokeWidth={2.5} />
        </CircleButton>
        {plate && !editing && (
          <View style={styles.topRight}>
            <CircleButton onPress={startEdit} label="Editar">
              <Pencil size={17} color={colors.foreground} strokeWidth={2.5} />
            </CircleButton>
            <CircleButton onPress={confirmDelete} label="Eliminar">
              <Trash2 size={18} color={colors.destructive} strokeWidth={2.5} />
            </CircleButton>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error || !plate ? (
        <View style={styles.center}>
          <Text style={{ color: colors.destructive, textAlign: 'center', paddingHorizontal: 32 }}>
            {error ?? 'Placa no encontrada'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Hero: muñequito grande (refleja el tipo elegido al editar) */}
          <View style={[styles.hero, { backgroundColor: withAlpha(accent, 0.16) }]}>
            <VehicleArt type={displayType} size={130} />
          </View>

          {/* Tarjeta de contenido, superpuesta al hero */}
          <View style={[styles.content, { backgroundColor: colors.card }]}>
            {editing ? (
              <>
                <TextInput
                  value={editPlate}
                  onChangeText={(t) => setEditPlate(t.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={16}
                  placeholder="ABC123"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.editInput, { color: colors.foreground, borderColor: accent }]}
                />
                <Text style={[styles.editHint, { color: colors.mutedForeground }]}>Tipo de vehículo</Text>
                <View style={styles.typeRow}>
                  {EDIT_TYPES.map((t) => {
                    const active = editType === t.key;
                    const c = colorFor(t.key);
                    return (
                      <Pressable
                        key={t.key}
                        onPress={() => setEditType(t.key)}
                        accessibilityRole="button"
                        accessibilityLabel={t.label}
                        style={[
                          styles.typeCard,
                          { borderColor: colors.border },
                          active && { borderColor: c, backgroundColor: withAlpha(c, 0.12) },
                        ]}
                      >
                        <VehicleArt type={t.key} size={44} />
                        <Text style={[styles.typeCardLabel, { color: active ? c : colors.foreground }]}>
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={saveEdit}
                  disabled={saving || !editPlate.trim()}
                  style={[styles.saveBtn, { backgroundColor: accent }, (saving || !editPlate.trim()) && { opacity: 0.6 }]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Guardar cambios</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setEditing(false)} style={styles.cancelBtn}>
                  <Text style={{ color: colors.mutedForeground, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>
              </>
            ) : (
              <>
            <Text style={[styles.plate, { color: colors.foreground }]}>{plate.plate}</Text>
            <View style={[styles.typePill, { backgroundColor: accent }]}>
              <Text style={styles.typePillText}>{labelFor(plate.plate_type).toUpperCase()}</Text>
            </View>

            <Section title="Detalle">
              <DetailRow icon={<Tag size={18} color={accent} />} label="Tipo" value={labelFor(plate.plate_type)} />
              <DetailRow icon={<Hash size={18} color={accent} />} label="Patrón" value={patternFor(plate.plate_type)} />
              <DetailRow icon={<Calendar size={18} color={accent} />} label="Fecha" value={fmtDate(plate.created_at)} />
              <DetailRow icon={<Clock size={18} color={accent} />} label="Hora" value={fmtTime(plate.created_at)} />
            </Section>

            <Section title="Ubicación">
              {plate.lat != null && plate.lng != null ? (
                <Pressable
                  style={styles.mapWrap}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir en Google Maps"
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${plate.lat},${plate.lng}`,
                    ).catch(() => {})
                  }
                >
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    pointerEvents="none"
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    customMapStyle={(isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT) as never}
                    region={{
                      latitude: plate.lat,
                      longitude: plate.lng,
                      latitudeDelta: 0.008,
                      longitudeDelta: 0.008,
                    }}
                  >
                    <Marker coordinate={{ latitude: plate.lat, longitude: plate.lng }}>
                      <View style={[styles.mapPin, { borderColor: accent }]}>
                        <VehicleArt type={displayType} size={26} />
                      </View>
                    </Marker>
                  </MapView>
                  <View style={[styles.coordRow, { borderColor: colors.border }]}>
                    <MapPin size={16} color={accent} />
                    <Text style={[styles.coordText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {plate.lat.toFixed(5)}, {plate.lng.toFixed(5)}
                    </Text>
                    <Text style={[styles.coordOpen, { color: accent }]}>Abrir mapa →</Text>
                  </View>
                </Pressable>
              ) : (
                <View style={[styles.emptyRow, { backgroundColor: colors.muted }]}>
                  <Text style={{ color: colors.mutedForeground }}>Sin ubicación registrada</Text>
                </View>
              )}
            </Section>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SheetView>
  );
}

function CircleButton({ children, onPress, label }: { children: ReactNode; onPress: () => void; label: string }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.circleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {children}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.detailRow, { backgroundColor: colors.muted }]}>
      <View style={styles.detailLeft}>
        {icon}
        <Text style={[styles.detailLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: colors.mutedForeground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 16,
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', height: 240, alignItems: 'center', justifyContent: 'center' },
  content: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: 'center',
  },
  plate: { fontSize: 34, fontWeight: '900', letterSpacing: 4 },
  typePill: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  typePillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  topRight: { flexDirection: 'row', gap: 8 },
  editInput: {
    alignSelf: 'stretch',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  editHint: { alignSelf: 'flex-start', marginTop: 22, marginBottom: 10, fontSize: 14, fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderWidth: 2,
    borderRadius: 16,
  },
  typeCardLabel: { fontSize: 13, fontWeight: '800' },
  saveBtn: {
    alignSelf: 'stretch',
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  cancelBtn: { alignSelf: 'center', marginTop: 14, paddingVertical: 8, paddingHorizontal: 20 },
  section: { alignSelf: 'stretch', marginTop: 26 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 8,
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 15, fontWeight: '600' },
  detailValue: { fontSize: 15, fontWeight: '700', flexShrink: 1, marginLeft: 12, textAlign: 'right' },
  mapWrap: { borderRadius: 16, overflow: 'hidden' },
  map: { width: '100%', height: 180 },
  mapPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1 },
  coordText: { fontSize: 14, fontWeight: '600', flex: 1 },
  coordOpen: { fontSize: 13, fontWeight: '800' },
  emptyRow: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 16, alignItems: 'center' },
});
