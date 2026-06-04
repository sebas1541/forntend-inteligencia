import { useRouter } from 'expo-router';
import { ScanLine } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { GlassButton } from '@/components/glass/glass-button';
import { GlassCard } from '@/components/glass/glass-card';
import { QuickPlateLogo } from '@/components/quick-plate-logo';
import { Screen } from '@/components/ui/screen';
import { PlateColors, Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

const PLATE_TYPES = [
  { key: 'particular', label: 'Particular', hint: 'Placa amarilla' },
  { key: 'publico', label: 'Público', hint: 'Placa blanca' },
  { key: 'moto', label: 'Moto', hint: 'Formato ABC12D' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <Screen>
      <View style={styles.hero}>
        <QuickPlateLogo size={64} showWordmark />
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Lectura y clasificación de placas vehiculares colombianas en tiempo real.
        </Text>
      </View>

      <GlassCard style={styles.card} interactive>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          Tipos de placa
        </Text>
        {PLATE_TYPES.map((t) => (
          <View key={t.key} style={styles.typeRow}>
            <View
              style={[styles.dot, { backgroundColor: PlateColors[t.key] }]}
            />
            <View style={styles.typeText}>
              <Text style={[styles.typeLabel, { color: colors.foreground }]}>
                {t.label}
              </Text>
              <Text style={[styles.typeHint, { color: colors.mutedForeground }]}>
                {t.hint}
              </Text>
            </View>
          </View>
        ))}
      </GlassCard>

      <View style={styles.footer}>
        <GlassButton
          intensity="clear"
          onPress={() => router.push('/scanner')}
          style={styles.cta}
        >
          <View style={styles.ctaInner}>
            <ScanLine size={20} color={colors.primary} />
            <Text style={[styles.ctaLabel, { color: colors.primary }]}>
              Escanear placa
            </Text>
          </View>
        </GlassButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: Radius.pill,
  },
  typeText: { gap: 1 },
  typeLabel: { fontSize: 16, fontWeight: '600' },
  typeHint: { fontSize: 13 },
  footer: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  cta: { alignSelf: 'stretch' },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ctaLabel: { fontSize: 17, fontWeight: '700' },
});
