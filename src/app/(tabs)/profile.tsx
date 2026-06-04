import { LogOut } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GlassButton } from '@/components/glass/glass-button';
import { GlassCard } from '@/components/glass/glass-card';
import { QuickPlateLogo } from '@/components/quick-plate-logo';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { withAlpha } from '@/utils/color';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { user, loading, signIn, signUp, signOut } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (user) {
    return (
      <Screen center>
        <GlassCard style={styles.card}>
          <QuickPlateLogo size={48} />
          <View style={styles.userInfo}>
            <Text style={[styles.email, { color: colors.foreground }]}>{user.email}</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Sesión activa</Text>
          </View>
          <GlassButton
            intensity="clear"
            tintColor={colors.destructive}
            onPress={() => void signOut()}
            style={styles.btn}
          >
            <View style={styles.row}>
              <LogOut size={18} color={colors.destructive} />
              <Text style={[styles.btnLabel, { color: colors.destructive }]}>Cerrar sesión</Text>
            </View>
          </GlassButton>
        </GlassCard>
      </Screen>
    );
  }

  async function submit() {
    setError(null);
    if (!email.includes('@') || password.length < 6) {
      setError('Ingresa un email válido y una contraseña de 6+ caracteres.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [
    styles.input,
    { color: colors.foreground, borderColor: colors.border, backgroundColor: withAlpha(colors.muted, 0.4) },
  ];

  return (
    <Screen center>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <GlassCard style={styles.card}>
          <QuickPlateLogo size={48} showWordmark />
          <Text style={[styles.heading, { color: colors.foreground }]}>
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            style={inputStyle}
          />

          {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}

          <GlassButton
            intensity="clear"
            label={mode === 'login' ? 'Entrar' : 'Registrarme'}
            loading={busy}
            onPress={submit}
            style={styles.btn}
          />

          <Pressable
            onPress={() => {
              setMode((m) => (m === 'login' ? 'register' : 'login'));
              setError(null);
            }}
          >
            <Text style={[styles.switch, { color: colors.primary }]}>
              {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </Pressable>
        </GlassCard>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kav: { width: '100%', alignItems: 'center' },
  card: { padding: Spacing.five, alignItems: 'center', gap: Spacing.three, width: '100%', maxWidth: 360 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: Spacing.one },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  error: { fontSize: 14, textAlign: 'center', alignSelf: 'stretch' },
  btn: { alignSelf: 'stretch', marginTop: Spacing.one },
  switch: { fontSize: 14, fontWeight: '600', marginTop: Spacing.two, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  btnLabel: { fontSize: 16, fontWeight: '600' },
  userInfo: { alignItems: 'center', gap: 2 },
  email: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 14 },
});
