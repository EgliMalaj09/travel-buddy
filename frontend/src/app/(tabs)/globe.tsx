import { AppText, Card, EmptyState, Screen } from '@/components';
import { repositories, useAsync } from '@/data';
import { flagEmoji } from '@/lib/trips';

/**
 * Globe tab placeholder. The globe itself comes with KAN-49 / KAN-50 after the globe test.
 * Visited = stops of finished trips (G2, places come later).
 */
export default function GlobeScreen() {
  const { data: countries = [] } = useAsync(async () => {
    const trips = await repositories.trips.listTrips();
    const finished = trips.filter((t) => t.status === 'finished');
    const stops = (
      await Promise.all(finished.map((t) => repositories.trips.listStops(t.id)))
    ).flat();
    return [...new Set(stops.map((s) => s.countryCode))];
  }, []);

  return (
    <Screen>
      <AppText variant="title">Globe</AppText>
      <EmptyState
        icon="earth-outline"
        title="Your globe comes here"
        message="Built after the globe test on a mid-range phone."
      />
      <Card>
        <AppText variant="label">Countries visited</AppText>
        <AppText variant="title">{countries.length}</AppText>
        <AppText variant="body">{countries.map(flagEmoji).join(' ')}</AppText>
      </Card>
    </Screen>
  );
}
