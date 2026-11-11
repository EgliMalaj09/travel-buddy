import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

/** Text field with label, error message and an optional show/hide toggle for passwords. */
export const Input = forwardRef<
  ComponentRef<typeof TextInput>,
  TextInputProps & { label?: string; error?: string; password?: boolean }
>(function Input({ label, error, password = false, ...rest }, ref) {
  const { colors, fonts, fontSizes, radii, space } = useTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: space.xs }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: error ? colors.accent : colors.border,
          borderWidth: 1,
          borderRadius: radii.md,
          paddingHorizontal: space.md,
        }}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={colors.inkSoft}
          secureTextEntry={password && hidden}
          accessibilityLabel={label}
          style={{
            flex: 1,
            paddingVertical: space.md,
            fontFamily: fonts.body,
            fontSize: fontSizes.md,
            color: colors.ink,
          }}
          {...rest}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.inkSoft}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.accent}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});
