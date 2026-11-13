import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Five suns (design guide "Departures": the trip rating). With `onChange` the user taps one to
 * rate; without it, it only shows the rating. A chosen sun is filled, not only coloured, so the
 * state is not shown by colour alone.
 */
export function SunRating({
  value,
  onChange,
  size = 40,
  emptyColor,
}: {
  /** 0 = not rated yet, 1 to 5. */
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  /** Colour of a sun that is not chosen (on the accent colour, use onAccent). */
  emptyColor?: string;
}) {
  const { colors, space } = useTheme();
  const suns = [1, 2, 3, 4, 5];
  if (!onChange) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Rated ${value} of 5`}
        style={{ flexDirection: 'row', gap: space.xs }}
      >
        {suns.map((i) => (
          <Ionicons
            key={i}
            name={i <= value ? 'sunny' : 'sunny-outline'}
            size={size}
            color={i <= value ? colors.sun : (emptyColor ?? colors.border)}
          />
        ))}
      </View>
    );
  }
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', gap: space.xs, justifyContent: 'center' }}
    >
      {suns.map((i) => (
        <Pressable
          key={i}
          accessibilityRole="radio"
          accessibilityLabel={`${i} of 5`}
          accessibilityState={{ selected: i === value }}
          onPress={() => onChange(i)}
          hitSlop={4}
          style={({ pressed }) => ({
            // At least 44 points to tap (design guide).
            width: Math.max(size + space.md, 44),
            height: Math.max(size + space.md, 44),
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.96 : i <= value ? 1.08 : 1 }],
          })}
        >
          <Ionicons
            name={i <= value ? 'sunny' : 'sunny-outline'}
            size={size}
            color={i <= value ? colors.sun : (emptyColor ?? colors.inkSoft)}
          />
        </Pressable>
      ))}
    </View>
  );
}
