import { repositories, useAsync, useDataVersion } from '@/data';
import type { Trip, TripStop } from '@/data/types';
import { loadExpenses, useHomeCurrency } from '@/features/expenses/useExpenses';
import { summarizeExpenses } from '@/lib/expenses';
import { passportStamps, tripRecap, type PassportStamp, type TripRecap } from '@/lib/finishTrip';

export interface RecapData {
  trip: Trip;
  recap: TripRecap;
  homeCurrency: string;
  /** The whole passport, oldest stamp first. */
  stamps: PassportStamp[];
}

/**
 * What the recap and stamp screens show, read from the phone (works offline). Expenses still
 * waiting for a rate are left out of "spent" and counted as converting.
 */
export function useRecap(tripId: string) {
  const version = useDataVersion();
  const homeCurrency = useHomeCurrency();
  return useAsync(async (): Promise<RecapData | null> => {
    const trip = await repositories.trips.getTrip(tripId);
    if (!trip) return null;
    const allTrips = await repositories.trips.listTrips();
    const stopLists = await Promise.all(allTrips.map((t) => repositories.trips.listStops(t.id)));
    const stopsByTrip = new Map<string, TripStop[]>(allTrips.map((t, i) => [t.id, stopLists[i]!]));
    const [places, photos, expenses] = await Promise.all([
      repositories.places.listPlaces(tripId),
      repositories.media.listPhotos(tripId),
      loadExpenses(tripId, homeCurrency).catch(() => null),
    ]);
    const spent = expenses
      ? summarizeExpenses(expenses.expenses, homeCurrency, expenses.rates)
      : { totalHome: 0, pending: 0 };
    return {
      trip,
      homeCurrency,
      stamps: passportStamps(allTrips, stopsByTrip),
      recap: tripRecap({
        trip,
        stops: stopsByTrip.get(trip.id) ?? [],
        places,
        photoCount: photos.length,
        spent,
        allTrips,
        stopsByTrip,
      }),
    };
  }, [tripId, version, homeCurrency]);
}
