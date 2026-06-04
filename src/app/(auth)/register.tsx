import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Mail, User as UserIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SheetView } from '@/components/sheet-view';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS = ['email', 'name', 'password'] as const;
type Step = (typeof STEPS)[number];

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { signUp } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const step: Step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const validate = (): boolean => {
    if (step === 'email' && !EMAIL_RE.test(email.trim())) {
      setError('Ingresa un correo válido');
      return false;
    }
    if (step === 'name' && fullName.trim().length < 2) {
      setError('Ingresa tu nombre');
      return false;
    }
    if (step === 'password' && password.length < 6) {
      setError('Mínimo 6 caracteres');
      return false;
    }
    setError(undefined);
    return true;
  };

  const goNext = async () => {
    if (!validate()) return;
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    setBusy(true);
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim());
      // Success → AuthGate dismisses the modal and lands on the tabs.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear la cuenta');
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    setError(undefined);
    if (isFirst) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
      return;
    }
    setStepIndex((i) => i - 1);
  };

  return (
    <SheetView>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12} style={styles.iconBtn}>
          {isFirst ? <X size={22} color={colors.foreground} /> : <ArrowLeft size={22} color={colors.foreground} />}
        </Pressable>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${((stepIndex + 1) / STEPS.length) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 'email' && (
            <Step title="¿Cuál es tu correo?" subtitle="Lo usarás para iniciar sesión.">
              <Input
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
                leftIcon={<Mail size={20} color={colors.primary} />}
                value={email}
                onChangeText={setEmail}
                error={error}
                onSubmitEditing={goNext}
              />
            </Step>
          )}
          {step === 'name' && (
            <Step title="¿Cómo te llamas?" subtitle="Tu nombre aparecerá en tu perfil.">
              <Input
                placeholder="Juan Pérez"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                autoFocus
                leftIcon={<UserIcon size={20} color={colors.primary} />}
                value={fullName}
                onChangeText={setFullName}
                error={error}
                onSubmitEditing={goNext}
              />
            </Step>
          )}
          {step === 'password' && (
            <Step title="Crea tu contraseña" subtitle="Mínimo 6 caracteres.">
              <Input
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password-new"
                textContentType="newPassword"
                autoFocus
                leftIcon={<Lock size={20} color={colors.primary} />}
                value={password}
                onChangeText={setPassword}
                error={error}
                onSubmitEditing={goNext}
              />
            </Step>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <Button
          label={isLast ? 'Crear cuenta' : 'Continuar'}
          size="lg"
          fullWidth
          loading={busy}
          onPress={goNext}
        />
      </View>
    </SheetView>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.step}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, paddingHorizontal: 20, paddingTop: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24 },
  step: { gap: Spacing.two },
  stepTitle: { fontSize: 26, fontWeight: '800' },
  stepSubtitle: { fontSize: 15, marginBottom: Spacing.three },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, borderTopWidth: 1 },
});
