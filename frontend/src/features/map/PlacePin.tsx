import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import type { PlaceCategory, PlaceStatus } from '@/data/types';
import { categoryIcons } from '@/lib/places';
import { useTheme } from '@/theme/ThemeProvider';

/** Pin size; a selected pin is drawn bigger. */
const SIZE = 32;

/**
 * A place on the map (data model 11): planned = outlined in the planned colour, visited = filled
 * in the accent colour, bucket list = dotted. The category icon sits inside.
 */
export function PlacePin({
  status,
  category,
  selected,
}: {
  status: PlaceStatus;
  category: PlaceCategory;
  selected?: boolean;
}) {
  const { colors } = useTheme();
  const size = selected ? SIZE * 1.25 : SIZE;
  const visited = status === 'visited';
  const tone = visited ? colors.accent : status === 'bucket' ? colors.bucket : colors.planned;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: selected ? 3 : 2,
        borderStyle: status === 'bucket' ? 'dotted' : 'solid',
        borderColor: tone,
        backgroundColor: visited ? tone : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons
        name={categoryIcons[category]}
        size={size * 0.5}
        color={visited ? colors.onAccent : tone}
      />
    </View>
  );
}

/** A trip stop on the map: a small dark flag, so the cities of the trip are easy to see. */
export function StopDot({ cityName }: { cityName: string }) {
  const { colors, fontSizes } = useTheme();
  const size = fontSizes.xs * 2;
  return (
    <View
      accessible
      accessibilityLabel={`Stop: ${cityName}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="flag" size={fontSizes.xs} color={colors.surface} />
    </View>
  );
}
