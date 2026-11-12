import type { Flight, IsoDate, Trip, TripStop } from '@/data/types';

import { stopDates } from './trips';
import { flightTitle } from './tripDraft';

/**
 * The "Today" suggestion on Home (KAN-45), for a trip that is happening now.
 * Agreed 12 Nov 2026: until Places exists (KAN-34) it shows what the trip already knows:
 * a travel day between two cities, today's flights and tonight's city. Planned places for today
 * are added here when Places is built.
 */

export type TodayIcon =
  'flag-outline' | 'airplane-outline' | 'car-outline' | 'bed-outline' | 'home-outline';

export interface TodayItem {
  key: string;
  icon: TodayIcon;
  text: string;
  detail?: string;
}

export function todayPlan(
  trip: Trip,
  stops: TripStop[],
  flights: Flight[],
  today: IsoDate,
): TodayItem[] {
  if (!trip.startDate || !trip.endDate || today < trip.startDate || today > trip.endDate) return [];
  const items: TodayItem[] = [];
  const dated = stopDates(
    trip.startDate,
    stops.filter((s) => !s.deletedAt),
  );

  if (today === trip.startDate) {
    items.push({ key: 'first', icon: 'flag-outline', text: 'First day of the trip' });
  }

  const flightsToday = flights
    .filter((f) => !f.deletedAt && f.departureLocalTime?.slice(0, 10) === today)
    .sort((a, b) => (a.departureLocalTime! < b.departureLocalTime! ? -1 : 1));
  for (const f of flightsToday) {
    const time = f.departureLocalTime!.slice(11, 16);
    items.push({
      key: `flight-${f.id}`,
      icon: 'airplane-outline',
      text: flightTitle(f) === 'Flight' ? 'Flight today' : `Flight ${flightTitle(f)}`,
      detail: time ? `Takes off at ${time}` : undefined,
    });
  }

  // A travel day: one stop ends today and the next one starts today.
  for (let i = 0; i < dated.length - 1; i++) {
    const from = dated[i];
    const to = dated[i + 1];
    if (from?.leave === today && to?.arrive === today && from.stop.cityName !== to.stop.cityName) {
      items.push({
        key: `move-${to.stop.id}`,
        icon: 'car-outline',
        text: `${from.stop.cityName} → ${to.stop.cityName} today`,
      });
    }
  }

  const tonight = dated.find(
    ({ arrive, leave }) => arrive && leave && arrive <= today && today < leave,
  );
  if (tonight) {
    items.push({
      key: 'tonight',
      icon: 'bed-outline',
      text: `Tonight in ${tonight.stop.cityName}`,
    });
  } else if (today === trip.endDate) {
    items.push({
      key: 'last',
      icon: 'home-outline',
      text: 'Last day of the trip. Safe journey home!',
    });
  }

  return items;
}
