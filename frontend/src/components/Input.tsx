import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

export function Input({ label, ...rest }: TextInputProps & { label?: string }) {
  const { colors, fonts, fontSizes, radii, space } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        placeholderTextColor={colors.inkSoft}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radii.md,
          paddingHorizontal: space.md,
          paddingVertical: space.md,
          fontFamily: fonts.body,
          fontSize: fontSizes.md,
          color: colors.ink,
        }}
        {...rest}
      />
    </View>
  );
}
