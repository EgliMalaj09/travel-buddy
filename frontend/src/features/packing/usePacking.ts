import { dataMode, repositories, useAsync, useDataVersion } from '@/data';
import type { TripStop } from '@/data/types';
import { planChecklist } from '@/lib/checklist';
import { packingView, type PackingView } from '@/lib/packing';
import { packingSuggestions } from '@/lib/packingRules';
import { weatherConditions, type TripWeather } from '@/lib/weather';
import { getTripWeather } from '@/services/weather';

import { oneAtATime } from '../checklist/useChecklist';

export interface PackingData {
  view: PackingView;
  weather: TripWeather | null;
  stops: TripStop[];
}

/**
 * Brings the trip's packing list in line with the rules and the weather, then returns it ready
 * to show (KAN-28). Same rules as the to-do list: new items are added, untouched ones follow the
 * trip (a longer trip means more socks), ticked or edited ones are never changed, nothing is
 * removed without the user. Works offline with the last weather the phone had.
 */
export async function loadPacking(tripId: string): Promise<PackingData | null> {
  const trip = await repositories.trips.getTrip(tripId);
  if (!trip) return null;
  const [stops, flights] = await Promise.all([
    repositories.trips.listStops(tripId),
    repositories.trips.listFlights(tripId),
  ]);
  // Mock mode has no server to ask. A finished trip needs no forecast.
  const weather =
    dataMode === 'mock' || trip.status === 'finished' ? null : await getTripWeather(trip, stops);
  const suggestions = packingSuggestions({
    trip,
    stops,
    flights,
    weather: weatherConditions(weather),
  });

  if (trip.status !== 'finished') {
    await oneAtATime(tripId, async () => {
      const plan = planChecklist(
        tripId,
        await repositories.checklist.listItems(tripId),
        suggestions,
      );
      await repositories.checklist.applyPlan(tripId, plan);
    });
  }

  const items = await repositories.checklist.listItems(tripId);
  return {
    view: packingView(items, suggestions, weatherConditions(weather).known),
    weather,
    stops,
  };
}

export function usePacking(tripId: string) {
  const version = useDataVersion();
  return useAsync(() => loadPacking(tripId), [tripId, version]);
}
