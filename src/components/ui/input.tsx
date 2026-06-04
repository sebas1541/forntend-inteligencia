import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, type ReactNode, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, hint, error, leftIcon, secureTextEntry, style, onFocus, onBlur, ...rest },
  ref,
) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const borderColor = error ? colors.destructive : focused ? colors.primary : colors.border;

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
          {hint && <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text>}
        </View>
      )}
      <View style={[styles.field, { borderColor, backgroundColor: colors.card }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.foreground }, style]}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.reveal}>
            {hidden ? (
              <Eye size={20} color={colors.mutedForeground} />
            ) : (
              <EyeOff size={20} color={colors.mutedForeground} />
            )}
          </Pressable>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  leftIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 0, height: '100%' },
  reveal: { paddingLeft: 8 },
  error: { fontSize: 13, marginTop: 4 },
});
