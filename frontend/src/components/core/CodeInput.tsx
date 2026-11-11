import { useRef, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

/** Six boxes for the 6-digit email code. One hidden field underneath keeps paste and autofill working. */
export function CodeInput({
  value,
  onChange,
  error,
  length = 6,
}: {
  value: string;
  onChange: (code: string) => void;
  error?: string;
  length?: number;
}) {
  const { colors, fonts, fontSizes, radii, space } = useTheme();
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <View style={{ gap: space.xs }}>
      <Pressable
        accessibilityLabel="Code"
        onPress={() => ref.current?.focus()}
        style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}
      >
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 56,
              borderRadius: radii.md,
              borderWidth: 1.5,
              borderColor: error ? colors.accent : i === value.length ? colors.ink : colors.border,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText style={{ fontFamily: fonts.mono, fontSize: fontSizes.xl }}>
              {value[i] ?? ''}
            </AppText>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={length}
        accessibilityLabel="Code field"
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
      />
      {error ? (
        <AppText variant="caption" color={colors.accent}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
