import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function PasswordScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuth();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  if (!email) return <Redirect href="/(auth)/login" />;

  const onSubmit = async () => {
    if (password.length < 6) {
      setError('Mínimo 6 caracteres');
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await signIn(email, password);
      // On success, the AuthGate dismisses the modal and lands on the tabs.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <ArrowLeft size={24} color={colors.primary} />
          </Pressable>

          <Text style={[styles.title, { color: colors.foreground }]}>Ingresa tu contraseña</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{email}</Text>

          <Input
            label="Contraseña"
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            autoFocus
            leftIcon={<Lock size={20} color={colors.primary} />}
            value={password}
            onChangeText={setPassword}
            error={error}
            onSubmitEditing={onSubmit}
          />

          <Pressable
            onPress={() => Alert.alert('Próximamente', 'Recuperación de contraseña')}
            style={styles.forgot}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>

          <Button
            label="Iniciar sesión"
            size="lg"
            fullWidth
            loading={busy}
            onPress={onSubmit}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 },
  back: { marginBottom: 24, width: 32 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 16, marginTop: 4, marginBottom: 32 },
  forgot: { alignSelf: 'flex-end', marginTop: 12 },
  forgotText: { fontSize: 14, fontWeight: '600' },
  cta: { marginTop: 24 },
});
