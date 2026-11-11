import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, EmptyState, Screen, TripStub } from '@/components';
import { repositories, useAsync } from '@/data';
import { todayIso } from '@/lib/dates';
import { groupLabels, groupTrips, phaseLine, tripCountries } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/** Trips list grouped Now / Upcoming / Someday / Past (Create a trip page). */
export default function TripsScreen() {
  const { space } = useTheme();
  const today = todayIso();
  const { data } = useAsync(async () => {
    const trips = await repositories.trips.listTrips();
    const stops = await Promise.all(trips.map((t) => repositories.trips.listStops(t.id)));
    return trips.map((trip, i) => ({ trip, countries: tripCountries(stops[i] ?? []) }));
  }, []);

  const countriesById = new Map(data?.map((d) => [d.trip.id, d.countries]));
  const groups = groupTrips(data?.map((d) => d.trip) ?? [], today);

  return (
    <Screen>
      <AppText variant="title">Trips</AppText>
      {data && groups.length === 0 ? (
        <EmptyState icon="airplane-outline" title="No trips yet" />
      ) : null}
      {groups.map(({ group, trips }) => (
        <View key={group} style={{ gap: space.sm }}>
          <AppText variant="label">{groupLabels[group]}</AppText>
          {trips.map((trip) => (
            <TripStub
              key={trip.id}
              trip={trip}
              countries={countriesById.get(trip.id) ?? []}
              phase={phaseLine(trip, today)}
              onPress={() => router.push(`/trip/${trip.id}`)}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}
