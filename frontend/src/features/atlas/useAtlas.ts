import { repositories, useAsync, useDataVersion } from '@/data';
import type { TripStop } from '@/data/types';
import {
  hereNow,
  lifetimeStats,
  visitedCountries,
  type LifetimeStats,
  type VisitedCountry,
} from '@/lib/atlas';
import { todayIso } from '@/lib/dates';
import { passportStamps, type PassportStamp } from '@/lib/finishTrip';

export interface AtlasData {
  stats: LifetimeStats;
  /** Oldest stamp first. */
  stamps: PassportStamp[];
  countries: VisitedCountry[];
  /** The country of today's stop on a trip that is on now. */
  here: string | null;
}

/** Everything the Atlas and Home's "Your travels" show, read from the phone (works offline). */
export function useAtlas() {
  const version = useDataVersion();
  return useAsync(async (): Promise<AtlasData> => {
    const trips = await repositories.trips.listTrips();
    const stopLists = await Promise.all(trips.map((t) => repositories.trips.listStops(t.id)));
    const stopsByTrip = new Map<string, TripStop[]>(trips.map((t, i) => [t.id, stopLists[i]!]));
    return {
      stats: lifetimeStats(trips, stopsByTrip),
      stamps: passportStamps(trips, stopsByTrip),
      countries: visitedCountries(trips, stopsByTrip),
      here: hereNow(trips, stopsByTrip, todayIso()),
    };
  }, [version]);
}
