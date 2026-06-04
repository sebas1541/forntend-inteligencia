import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/glass/glass-card';
import { QuickPlateLogo } from '@/components/quick-plate-logo';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen center>
        <GlassCard style={styles.card}>
          <QuickPlateLogo height={44} />
          <Text style={[styles.title, { color: colors.foreground }]}>Inicia sesión</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Crea una cuenta para guardar y ver tus placas registradas.
          </Text>
          <Button
            label="Iniciar sesión o registrarte"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/login')}
            style={styles.action}
          />
        </GlassCard>
      </Screen>
    );
  }

  const displayName = user.full_name?.trim() || user.email.split('@')[0];

  return (
    <Screen center>
      <GlassCard style={styles.card}>
        <Avatar name={displayName} size={96} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.email}</Text>
        </View>
        <Button variant="secondary" size="lg" fullWidth onPress={() => void signOut()} style={styles.action}>
          <View style={styles.row}>
            <LogOut size={18} color={colors.destructive} />
            <Text style={[styles.logout, { color: colors.destructive }]}>Cerrar sesión</Text>
          </View>
        </Button>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.five, alignItems: 'center', gap: Spacing.three, width: '100%', maxWidth: 360 },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  info: { alignItems: 'center', gap: 2 },
  name: { fontSize: 20, fontWeight: '800' },
  email: { fontSize: 14 },
  action: { marginTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logout: { fontSize: 16, fontWeight: '600' },
});
