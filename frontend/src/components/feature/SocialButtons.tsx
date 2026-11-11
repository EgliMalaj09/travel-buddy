import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from '@/components/core';

/** "Continue with Apple / Google". Apple is shown on iOS and Android (L-decisions). */
export function SocialButtons({
  onApple,
  onGoogle,
  disabled,
}: {
  onApple: () => void;
  onGoogle: () => void;
  disabled?: boolean;
}) {
  const { colors, radii, space } = useTheme();
  const button = (
    label: string,
    icon: 'logo-apple' | 'logo-google',
    onPress: () => void,
    dark: boolean,
  ) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        minHeight: 50,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: dark ? colors.ink : colors.border,
        backgroundColor: dark ? colors.ink : colors.surface,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={dark ? colors.surface : colors.ink} />
      <AppText variant="label" color={dark ? colors.surface : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
  return (
    <View style={{ gap: space.sm }}>
      {button('Continue with Apple', 'logo-apple', onApple, true)}
      {button('Continue with Google', 'logo-google', onGoogle, false)}
    </View>
  );
}

export function OrDivider() {
  const { colors, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <AppText variant="caption">or with email</AppText>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}
