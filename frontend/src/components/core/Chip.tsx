import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors, radii, space } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accent : colors.surface,
        paddingVertical: space.xs,
        paddingHorizontal: space.md,
      }}
    >
      <AppText variant="label" color={selected ? colors.onAccent : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}
