import { Link, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleLogo } from '@/components/google-logo';
import { QuickPlateLogo } from '@/components/quick-plate-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();

  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const onContinue = () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError('Ingresa un correo válido');
      return;
    }
    setError(undefined);
    router.push({ pathname: '/(auth)/password', params: { email: value } });
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <Pressable onPress={dismiss} hitSlop={12} style={styles.close} accessibilityLabel="Cerrar">
        <X size={24} color={colors.foreground} />
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <QuickPlateLogo height={56} />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Inicia sesión o regístrate
            </Text>
          </View>

          <Input
            placeholder="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            error={error}
            onSubmitEditing={onContinue}
            returnKeyType="next"
          />

          <Button label="Continuar" size="lg" fullWidth onPress={onContinue} style={styles.cta} />

          <View style={styles.dividerRow}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.or, { color: colors.mutedForeground }]}>o</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            onPress={() => Alert.alert('Próximamente', 'Login con Google')}
            accessibilityRole="button"
            accessibilityLabel="Continuar con Google"
            style={({ pressed }) => [
              styles.googleBtn,
              { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.card },
            ]}
          >
            <GoogleLogo size={20} />
            <Text style={[styles.googleText, { color: colors.foreground }]}>Continuar con Google</Text>
          </Pressable>

          <View style={styles.signup}>
            <Text style={{ color: colors.mutedForeground }}>¿No tienes cuenta? </Text>
            <Link href="/(auth)/register">
              <Text style={[styles.signupLink, { color: colors.primary }]}>Regístrate aquí</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  close: { position: 'absolute', top: Spacing.three, right: Spacing.three, zIndex: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 40 },
  title: { marginTop: 32, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  cta: { marginTop: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1 },
  or: { marginHorizontal: 12, fontSize: 14 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
  },
  googleText: { fontSize: 16, fontWeight: '600' },
  signup: { marginTop: 40, flexDirection: 'row', justifyContent: 'center' },
  signupLink: { fontWeight: '700' },
});
