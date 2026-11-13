import { Stack } from 'expo-router';

import { EmptyState, Screen } from '@/components';
import { repositories, useAsync, useDataVersion } from '@/data';
import { todayIso } from '@/lib/dates';

import { TripMap } from './TripMap';

/** The trip map on the whole screen (opened from the Map tab). */
export function TripMapScreen({ id }: { id: string }) {
  const version = useDataVersion();
  const { data, loading } = useAsync(async () => {
    const trip = await repositories.trips.getTrip(id);
    if (!trip) return null;
    const [stops, places] = await Promise.all([
      repositories.trips.listStops(id),
      repositories.places.listPlaces(id),
    ]);
    return { trip, stops, places };
  }, [id, version]);

  if (loading && !data) return null;
  if (!data) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Trip not found" />
      </Screen>
    );
  }
  return (
    <>
      <Stack.Screen options={{ title: data.trip.name, headerBackTitle: 'Back' }} />
      <Screen scroll={false}>
        <TripMap
          trip={data.trip}
          stops={data.stops}
          places={data.places}
          today={todayIso()}
          fullScreen
        />
      </Screen>
    </>
  );
}
