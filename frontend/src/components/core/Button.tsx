import { Pressable, type PressableProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

type Kind = 'primary' | 'secondary' | 'ghost';

export function Button({
  title,
  kind = 'primary',
  disabled,
  ...rest
}: Omit<PressableProps, 'children'> & { title: string; kind?: Kind }) {
  const { colors, radii, space } = useTheme();
  const bg =
    kind === 'primary' ? colors.accent : kind === 'secondary' ? colors.surface : 'transparent';
  const fg = kind === 'primary' ? colors.onAccent : colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: radii.md,
        borderWidth: kind === 'secondary' ? 1 : 0,
        borderColor: colors.accent,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        alignItems: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
      {...rest}
    >
      <AppText variant="label" color={fg}>
        {title}
      </AppText>
    </Pressable>
  );
}
