import { View } from 'react-native';

import { AppText } from '@/components';
import type { IsoDate, Trip, TripStop } from '@/data/types';
import { formatDateRange } from '@/lib/dates';
import { activityLabels } from '@/lib/tripDraft';
import { flagEmoji, phaseLine, tripCountries } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/** Top of the trip page: name, dates, where it is in time, countries and activities. */
export function TripHeader({
  trip,
  stops,
  today,
}: {
  trip: Trip;
  stops: TripStop[];
  today: IsoDate;
}) {
  const { colors, space } = useTheme();
  const phase = phaseLine(trip, today);
  const flags = tripCountries(stops).map(flagEmoji).join(' ');
  const activities = trip.activities.map((a) => activityLabels[a]).join(' · ');
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="title">{trip.name}</AppText>
      <AppText variant="date">
        {trip.startDate ? formatDateRange(trip.startDate, trip.endDate) : 'Someday'}
        {flags ? `  ${flags}` : ''}
      </AppText>
      {phase ? (
        <AppText variant="label" color={colors.accent}>
          {phase}
        </AppText>
      ) : null}
      {activities ? <AppText variant="caption">{activities}</AppText> : null}
    </View>
  );
}
