import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText, Card, EmptyState, Screen } from '@/components';
import { repositories, useAsync } from '@/data';
import { formatDateRange, todayIso } from '@/lib/dates';
import { flagEmoji, phaseLine, stopDates } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/** Trip screen shell: header and stops timeline. Tabs and features come with KAN-53. */
export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, space } = useTheme();
  const today = todayIso();
  const { data, loading } = useAsync(async () => {
    const trip = await repositories.trips.getTrip(id);
    const stops = trip ? await repositories.trips.listStops(trip.id) : [];
    return { trip, stops };
  }, [id]);

  if (loading) return null;
  const trip = data?.trip;
  if (!trip) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Trip not found" />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '', headerBackTitle: 'Back' }} />
      <Screen>
        <View style={{ gap: space.xs }}>
          <AppText variant="title">{trip.name}</AppText>
          <AppText variant="date">{formatDateRange(trip.startDate, trip.endDate)}</AppText>
          {phaseLine(trip, today) ? (
            <AppText variant="label" color={colors.accent}>
              {phaseLine(trip, today)}
            </AppText>
          ) : null}
        </View>

        <Card>
          <AppText variant="label">Stops</AppText>
          {stopDates(trip.startDate, data?.stops ?? []).map(({ stop, arrive, leave }) => (
            <View
              key={stop.id}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}
            >
              <AppText variant="body">
                {flagEmoji(stop.countryCode)} {stop.cityName}
              </AppText>
              <AppText variant="date">
                {arrive ? formatDateRange(arrive, leave) : `${stop.nights} nights`}
              </AppText>
            </View>
          ))}
        </Card>
      </Screen>
    </>
  );
}
