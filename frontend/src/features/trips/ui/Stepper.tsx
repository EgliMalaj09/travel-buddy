import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

/** − 3 nights + (nights per stop, T3). */
export function Stepper({
  value,
  label,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
}: {
  value: number;
  label: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
}) {
  const { colors, radii, space } = useTheme();
  const button = (
    icon: 'remove' | 'add',
    onPress: () => void,
    disabled?: boolean,
    a11y?: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={colors.accent} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {button('remove', onMinus, minusDisabled, `One night less in ${label}`)}
      <AppText variant="date" style={{ minWidth: 72, textAlign: 'center' }}>
        {value === 1 ? '1 night' : `${value} nights`}
      </AppText>
      {button('add', onPlus, plusDisabled, `One night more in ${label}`)}
    </View>
  );
}
