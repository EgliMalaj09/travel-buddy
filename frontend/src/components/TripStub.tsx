import { Pressable, View } from 'react-native';

import type { Trip } from '@/data/types';
import { formatDateRange } from '@/lib/dates';
import { flagEmoji } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

/**
 * A trip shown as a ticket stub (design direction): main part with name and dates,
 * a dashed tear line, and a small stub with the countdown or phase.
 */
export function TripStub({
  trip,
  countries,
  phase,
  onPress,
}: {
  trip: Trip;
  countries: string[];
  phase: string;
  onPress?: () => void;
}) {
  const { colors, radii, space } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}, ${formatDateRange(trip.startDate, trip.endDate)}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, padding: space.lg, gap: space.xs }}>
        <AppText variant="heading" numberOfLines={1}>
          {trip.name}
        </AppText>
        <AppText variant="date">{formatDateRange(trip.startDate, trip.endDate)}</AppText>
        <AppText variant="body">{countries.map(flagEmoji).join(' ')}</AppText>
      </View>
      <View
        style={{
          width: 96,
          borderLeftWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.inkSoft,
          alignItems: 'center',
          justifyContent: 'center',
          padding: space.sm,
        }}
      >
        <AppText variant="date" color={colors.accent} style={{ textAlign: 'center' }}>
          {phase || (trip.status === 'finished' ? 'Finished' : '—')}
        </AppText>
      </View>
    </Pressable>
  );
}
