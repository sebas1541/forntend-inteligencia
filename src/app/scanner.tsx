import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, CameraOff } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

import { GlassButton } from '@/components/glass/glass-button';
import { GlassCard } from '@/components/glass/glass-card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function ScannerScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [isActive, setActive] = useState(false);

  // Camera only streams while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  // Ask once on mount if we don't have permission yet.
  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <Fallback
        icon={<CameraOff size={40} color="#737373" />}
        title="Permiso de cámara"
        message="QuickPlate necesita acceso a la cámara para escanear placas."
        actionLabel="Permitir cámara"
        onAction={() => {
          void requestPermission().then((granted) => {
            if (!granted) void Linking.openSettings();
          });
        }}
      />
    );
  }

  if (!device) {
    return (
      <Fallback
        icon={<CameraOff size={40} color="#737373" />}
        title="Sin cámara"
        message="No se encontró una cámara trasera. Probá en un dispositivo físico (el simulador de iOS no tiene cámara)."
      />
    );
  }

  return (
    <View style={styles.fill}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={isActive} />
      <CameraOverlay />
    </View>
  );
}

/** Header + scan frame drawn on top of the live camera. */
function CameraOverlay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <GlassCard radius={Radius.pill} interactive style={styles.iconBtn}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </GlassCard>
        </Pressable>
        <Text style={styles.headerTitle}>Escáner</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.center} pointerEvents="none">
        <View style={styles.frame}>
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
        </View>
        <Text style={styles.hint}>Apuntá a la placa</Text>
      </View>

      <View style={{ height: insets.bottom + Spacing.three }} />
    </View>
  );
}

/** Permission / no-device states reuse the themed (non-camera) layout. */
function Fallback({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.headerPlain}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <GlassCard radius={Radius.pill} interactive style={styles.iconBtn}>
            <ArrowLeft size={22} color={colors.foreground} />
          </GlassCard>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Escáner</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.center}>
        <GlassCard style={styles.fallbackCard}>
          {icon}
          <Text style={[styles.fallbackTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.fallbackMsg, { color: colors.mutedForeground }]}>{message}</Text>
          {actionLabel && onAction && (
            <GlassButton intensity="clear" label={actionLabel} onPress={onAction} style={styles.fallbackBtn} />
          )}
        </GlassCard>
      </View>
    </Screen>
  );
}

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const map: Record<typeof pos, ViewStyle> = {
    tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: Radius.md },
    tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: Radius.md },
    bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: Radius.md },
    br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: Radius.md },
  };
  return <View style={[styles.corner, map[pos]]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  headerPlain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.four },
  frame: {
    width: 300,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
  },
  hint: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  fallbackCard: {
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
    maxWidth: 340,
  },
  fallbackTitle: { fontSize: 20, fontWeight: '700' },
  fallbackMsg: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  fallbackBtn: { alignSelf: 'stretch', marginTop: Spacing.two },
});
