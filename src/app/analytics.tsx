import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { Download, MapPin, X } from 'lucide-react-native';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { VehicleArt } from '@/components/vehicle-art';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { api, type Plate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { withAlpha } from '@/utils/color';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TYPE_META: { key: string; label: string; color: string; match: (t: string) => boolean }[] = [
  { key: 'carro', label: 'Carros', color: '#16A34A', match: (t) => t === 'carro' || t === 'particular' },
  { key: 'moto', label: 'Motos', color: '#4F46E5', match: (t) => t === 'moto' },
  { key: 'publico', label: 'Públicos', color: '#334155', match: (t) => t === 'publico' },
];

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function AnalyticsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { token } = useAuth();

  const [plates, setPlates] = useState<Plate[] | null>(null);

  useEffect(() => {
    let alive = true;
    if (token) api.listPlates(token).then((p) => alive && setPlates(p)).catch(() => alive && setPlates([]));
    else setPlates([]);
    return () => {
      alive = false;
    };
  }, [token]);

  const stats = useMemo(() => {
    const list = plates ?? [];
    const counts = TYPE_META.map((m) => list.filter((p) => m.match(p.plate_type)).length);
    const conUbic = list.filter((p) => p.lat != null && p.lng != null).length;
    const lugares = new Set(
      list
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => `${(p.lat as number).toFixed(3)},${(p.lng as number).toFixed(3)}`),
    ).size;

    // Escaneos por día (últimos 7 días, incl. hoy).
    const today = new Date();
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toDateString();
      const count = list.filter((p) => new Date(p.created_at).toDateString() === key).length;
      days.push({ label: DAY_LABELS[d.getDay()], count });
    }

    return { total: list.length, counts, conUbic, lugares, days };
  }, [plates]);

  const exportCsv = async () => {
    const list = plates ?? [];
    const header = 'placa,tipo,fecha,latitud,longitud\n';
    const rows = list
      .map((p) => {
        const fecha = new Date(p.created_at).toISOString();
        return `${p.plate},${p.plate_type},${fecha},${p.lat ?? ''},${p.lng ?? ''}`;
      })
      .join('\n');
    const csv = header + rows;
    try {
      const uri = `${FileSystem.cacheDirectory}quickplate-historial.csv`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (Platform.OS === 'ios') await Share.share({ url: uri });
      else await Share.share({ message: csv });
    } catch {
      await Share.share({ message: csv }).catch(() => {});
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Cerrar"
          style={[styles.headerBtn, { backgroundColor: colors.muted }]}
        >
          <X size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Análisis</Text>
        <Pressable
          onPress={exportCsv}
          hitSlop={10}
          accessibilityLabel="Exportar CSV"
          style={[styles.exportBtn, { backgroundColor: colors.primary }]}
        >
          <Download size={16} color={colors.primaryForeground} />
          <Text style={[styles.exportText, { color: colors.primaryForeground }]}>CSV</Text>
        </Pressable>
      </View>

      {plates === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : stats.total === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            Escanea placas para ver tu análisis de datos.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Tarjetas resumen */}
          <View style={styles.cards}>
            <StatCard index={0} value={stats.total} label="Placas" color={colors.primary} />
            <StatCard index={1} value={stats.counts[0]} label="Carros" color={TYPE_META[0].color} />
            <StatCard index={2} value={stats.counts[1]} label="Motos" color={TYPE_META[1].color} />
            <StatCard index={3} value={stats.counts[2]} label="Públicos" color={TYPE_META[2].color} />
          </View>

          {/* Donut: distribución por tipo */}
          <Section title="Distribución por tipo">
            <View style={styles.donutRow}>
              <DonutChart segments={TYPE_META.map((m, i) => ({ value: stats.counts[i], color: m.color }))} total={stats.total} colors={colors} />
              <View style={styles.legend}>
                {TYPE_META.map((m, i) => {
                  const v = stats.counts[i];
                  const pct = stats.total ? Math.round((v / stats.total) * 100) : 0;
                  return (
                    <View key={m.key} style={styles.legendRow}>
                      <VehicleArt type={m.key} size={28} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.legendLabel, { color: colors.foreground }]}>{m.label}</Text>
                        <Text style={[styles.legendSub, { color: colors.mutedForeground }]}>
                          {v} · {pct}%
                        </Text>
                      </View>
                      <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                    </View>
                  );
                })}
              </View>
            </View>
          </Section>

          {/* Barras: escaneos por día */}
          <Section title="Escaneos · últimos 7 días">
            <BarChart days={stats.days} colors={colors} />
          </Section>

          {/* Ubicación */}
          <Section title="Ubicación">
            <View style={styles.ubicRow}>
              <UbicCard icon={<MapPin size={20} color={colors.primary} />} value={stats.conUbic} label="Con ubicación" colors={colors} />
              <UbicCard icon={<MapPin size={20} color={colors.mutedForeground} />} value={stats.lugares} label="Lugares distintos" colors={colors} />
            </View>
          </Section>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
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

function StatCard({ index, value, label, color }: { index: number; value: number; label: string; color: string }) {
  const colors = useThemeColors();
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify().damping(14)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Animated.View>
  );
}

function DonutChart({
  segments,
  total,
  colors,
}: {
  segments: { value: number; color: string }[];
  total: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const size = 168;
  const strokeWidth = 26;
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const safeTotal = total || 1;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  let cumulative = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / safeTotal;
      const startFrac = cumulative;
      cumulative += frac;
      return { ...s, frac, startFrac };
    });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={withAlpha(colors.mutedForeground, 0.15)} strokeWidth={strokeWidth} fill="none" />
        {arcs.map((a) => (
          <DonutSegment
            key={a.color}
            frac={a.frac}
            startFrac={a.startFrac}
            color={a.color}
            progress={progress}
            size={size}
            r={r}
            C={C}
            strokeWidth={strokeWidth}
          />
        ))}
      </Svg>
      <View style={styles.donutCenter} pointerEvents="none">
        <Text style={[styles.donutTotal, { color: colors.foreground }]}>{total}</Text>
        <Text style={[styles.donutCaption, { color: colors.mutedForeground }]}>placas</Text>
      </View>
    </View>
  );
}

function DonutSegment({
  frac,
  startFrac,
  color,
  progress,
  size,
  r,
  C,
  strokeWidth,
}: {
  frac: number;
  startFrac: number;
  color: string;
  progress: ReturnType<typeof useSharedValue<number>>;
  size: number;
  r: number;
  C: number;
  strokeWidth: number;
}) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: C - frac * C * progress.value,
  }));
  return (
    <AnimatedCircle
      cx={size / 2}
      cy={size / 2}
      r={r}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeDasharray={`${C} ${C}`}
      animatedProps={animatedProps}
      rotation={-90 + startFrac * 360}
      origin={`${size / 2}, ${size / 2}`}
    />
  );
}

function BarChart({
  days,
  colors,
}: {
  days: { label: string; count: number }[];
  colors: ReturnType<typeof useThemeColors>;
}) {
  const max = Math.max(...days.map((d) => d.count), 1);
  return (
    <View style={styles.barChart}>
      {days.map((d, i) => (
        <View key={i} style={styles.barCol}>
          <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{d.count > 0 ? d.count : ''}</Text>
          <View style={styles.barTrack}>
            <Bar frac={d.count / max} delay={i * 70} color={colors.primary} />
          </View>
          <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

const BAR_MAX_H = 110;

function Bar({ frac, delay, color }: { frac: number; delay: number; color: string }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withTiming(frac * BAR_MAX_H, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [h, frac, delay]);
  const style = useAnimatedStyle(() => ({ height: Math.max(h.value, frac > 0 ? 4 : 0) }));
  return <Animated.View style={[styles.bar, style, { backgroundColor: color }]} />;
}

function UbicCard({
  icon,
  value,
  label,
  colors,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.ubicCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {icon}
      <Text style={[styles.ubicValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.ubicLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20 },
  exportText: { fontSize: 14, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  cardValue: { fontSize: 30, fontWeight: '900' },
  cardLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  section: { marginTop: 26 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotal: { fontSize: 30, fontWeight: '900' },
  donutCaption: { fontSize: 12, marginTop: -2 },
  legend: { flex: 1, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendLabel: { fontSize: 15, fontWeight: '700' },
  legendSub: { fontSize: 13, marginTop: 1 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: BAR_MAX_H + 44 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 12, fontWeight: '700', marginBottom: 4, height: 16 },
  barTrack: { height: BAR_MAX_H, justifyContent: 'flex-end', width: '60%' },
  bar: { width: '100%', borderRadius: 8, minHeight: 0 },
  barLabel: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  ubicRow: { flexDirection: 'row', gap: 12 },
  ubicCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, gap: 6 },
  ubicValue: { fontSize: 26, fontWeight: '900' },
  ubicLabel: { fontSize: 13 },
});
