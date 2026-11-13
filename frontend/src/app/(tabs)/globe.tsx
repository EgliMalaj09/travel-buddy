import { AppText, EmptyState, PassportGrid, Screen } from '@/components';
import { repositories, useAsync, useDataVersion, type TripStop } from '@/data';
import { findCountry } from '@/data/static/countries';
import { passportStamps, stampDate } from '@/lib/finishTrip';

/**
 * Globe tab placeholder. The globe itself comes with KAN-49 / KAN-50 after the globe test.
 * Visited = stops of finished trips (G2, places come later): the passport from Finish trip (KAN-47).
 */
export default function GlobeScreen() {
  const version = useDataVersion();
  const { data: stamps = [] } = useAsync(async () => {
    const trips = await repositories.trips.listTrips();
    const stops = await Promise.all(trips.map((t) => repositories.trips.listStops(t.id)));
    return passportStamps(
      trips,
      new Map<string, TripStop[]>(trips.map((t, i) => [t.id, stops[i]!])),
    );
  }, [version]);

  return (
    <Screen>
      <AppText variant="title">Globe</AppText>
      <EmptyState
        icon="earth-outline"
        title="Your globe comes here"
        message="Built after the globe test on a mid-range phone."
      />
      <AppText variant="heading">
        Passport · {stamps.length === 1 ? '1 country' : `${stamps.length} countries`}
      </AppText>
      {stamps.length ? (
        <PassportGrid
          stamps={stamps.map((s) => ({
            code: s.countryCode,
            name: findCountry(s.countryCode)?.name ?? s.countryCode,
            date: stampDate(s.date),
          }))}
        />
      ) : (
        <AppText variant="body">Finish a trip and its countries get a stamp here.</AppText>
      )}
    </Screen>
  );
}
