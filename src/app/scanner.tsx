import { useRouter } from 'expo-router';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { GlassCard } from '@/components/glass/glass-card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function ScannerScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <GlassCard radius={Radius.pill} interactive style={styles.iconBtn}>
            <ArrowLeft size={22} color={colors.foreground} />
          </GlassCard>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Escáner</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.viewfinder}>
        <View style={[styles.frame, { borderColor: colors.primary }]}>
          <Corner pos="tl" color={colors.primary} />
          <Corner pos="tr" color={colors.primary} />
          <Corner pos="bl" color={colors.primary} />
          <Corner pos="br" color={colors.primary} />
          <Camera size={40} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          Cámara en vivo (próximamente)
        </Text>
      </View>
    </Screen>
  );
}

function Corner({ pos, color }: { pos: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const map: Record<typeof pos, ViewStyle> = {
    tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: Radius.md },
    tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: Radius.md },
    bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: Radius.md },
    br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: Radius.md },
  };
  return <View style={[styles.corner, { borderColor: color }, map[pos]]} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  frame: {
    width: 280,
    height: 180,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
  },
  note: { fontSize: 15 },
});
