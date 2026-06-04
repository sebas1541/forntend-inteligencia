import { useFocusEffect } from 'expo-router';
import { CameraOff } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View, type ViewStyle } from 'react-native';
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

  // Stream only while the Escanear tab is focused.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <Fallback
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
        title="Sin cámara"
        message="No se encontró una cámara trasera. Probá en un dispositivo físico (el simulador no tiene cámara)."
      />
    );
  }

  return (
    <View style={styles.fill}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={isActive} />
      <View style={styles.center} pointerEvents="none">
        <View style={styles.frame}>
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
        </View>
        <Text style={styles.hint}>Apuntá a la placa</Text>
      </View>
    </View>
  );
}

function Fallback({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Screen center>
      <GlassCard style={styles.fallbackCard}>
        <CameraOff size={40} color={colors.mutedForeground} />
        <Text style={[styles.fallbackTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.fallbackMsg, { color: colors.mutedForeground }]}>{message}</Text>
        {actionLabel && onAction && (
          <GlassButton intensity="clear" label={actionLabel} onPress={onAction} style={styles.fallbackBtn} />
        )}
      </GlassCard>
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
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  frame: { width: 300, height: 190, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#FFFFFF' },
  hint: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  fallbackCard: { padding: Spacing.five, alignItems: 'center', gap: Spacing.three, maxWidth: 340 },
  fallbackTitle: { fontSize: 20, fontWeight: '700' },
  fallbackMsg: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  fallbackBtn: { alignSelf: 'stretch', marginTop: Spacing.two },
});
