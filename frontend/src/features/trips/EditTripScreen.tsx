import { router } from 'expo-router';

import { EmptyState, Screen } from '@/components';
import { repositories, useAsync } from '@/data';
import { draftFromTrip, draftToInput } from '@/lib/tripDraft';

import { TripWizard } from './TripWizard';

/** Edit everything from the trip's ••• menu: stops, dates, flights, activities, name. */
export function EditTripScreen({ id }: { id: string }) {
  const { data, loading } = useAsync(async () => {
    const trip = await repositories.trips.getTrip(id);
    if (!trip) return null;
    const [stops, flights] = await Promise.all([
      repositories.trips.listStops(id),
      repositories.trips.listFlights(id),
    ]);
    return draftFromTrip(trip, stops, flights);
  }, [id]);

  if (loading) return null;
  if (!data) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Trip not found" />
      </Screen>
    );
  }
  return (
    <TripWizard
      mode="edit"
      initial={data}
      onSubmit={async (draft) => {
        await repositories.trips.updateTrip(id, draftToInput(draft));
        router.back();
      }}
    />
  );
}
