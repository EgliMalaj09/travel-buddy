import type { IsoDate, Trip, TripStop } from '@/data/types';

import { addDays, daysBetween } from './dates';

export type TripGroup = 'now' | 'upcoming' | 'someday' | 'past';

/** Which Trips-list group a trip belongs to (Create a trip page, "Trips list"). */
export function tripGroup(trip: Trip, today: IsoDate): TripGroup {
  if (trip.status === 'finished') return 'past';
  if (!trip.startDate || !trip.endDate) return 'someday';
  if (today < trip.startDate) return 'upcoming';
  if (today > trip.endDate) return 'past';
  return 'now';
}

export const groupLabels: Record<TripGroup, string> = {
  now: 'Now',
  upcoming: 'Upcoming',
  someday: 'Someday',
  past: 'Past',
};

const groupOrder: TripGroup[] = ['now', 'upcoming', 'someday', 'past'];

/** Trips grouped and sorted: upcoming by start date, past newest first. Empty groups left out. */
export function groupTrips(trips: Trip[], today: IsoDate): { group: TripGroup; trips: Trip[] }[] {
  const buckets = new Map<TripGroup, Trip[]>(groupOrder.map((g) => [g, []]));
  for (const t of trips) {
    if (t.deletedAt) continue;
    buckets.get(tripGroup(t, today))!.push(t);
  }
  buckets.get('upcoming')!.sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1));
  buckets.get('past')!.sort((a, b) => ((a.endDate ?? '') > (b.endDate ?? '') ? -1 : 1));
  return groupOrder
    .map((group) => ({ group, trips: buckets.get(group)! }))
    .filter((g) => g.trips.length > 0);
}

/** "in 23 days", "tomorrow", "Day 3 of 7", "" for someday or past. */
export function phaseLine(trip: Trip, today: IsoDate): string {
  const group = tripGroup(trip, today);
  if (group === 'upcoming' && trip.startDate) {
    const d = daysBetween(today, trip.startDate);
    return d === 1 ? 'Tomorrow' : `In ${d} days`;
  }
  if (group === 'now' && trip.startDate && trip.endDate) {
    const day = daysBetween(trip.startDate, today) + 1;
    const total = daysBetween(trip.startDate, trip.endDate) + 1;
    return `Day ${day} of ${total}`;
  }
  return '';
}

/** Arrival and departure of each stop, computed from the start date and nights (not stored). */
export function stopDates(
  startDate: IsoDate | null,
  stops: TripStop[],
): { stop: TripStop; arrive: IsoDate | null; leave: IsoDate | null }[] {
  const sorted = [...stops].sort((a, b) => a.order - b.order);
  let cursor = startDate;
  return sorted.map((stop) => {
    const arrive = cursor;
    const leave = cursor ? addDays(cursor, stop.nights) : null;
    cursor = leave;
    return { stop, arrive, leave };
  });
}

/** Unique country codes of the stops, in trip order. */
export function tripCountries(stops: TripStop[]): string[] {
  const seen: string[] = [];
  for (const s of [...stops].sort((a, b) => a.order - b.order)) {
    if (!seen.includes(s.countryCode)) seen.push(s.countryCode);
  }
  return seen;
}

/** Flag emoji from an ISO country code ("IT" → 🇮🇹). */
export function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)));
}
