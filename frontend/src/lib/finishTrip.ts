import type { IsoDate, Place, Trip, TripStop } from '@/data/types';

import { daysBetween } from './dates';
import { tripCountries } from './trips';

/**
 * Finish trip (KAN-47), pure logic: when to ask "How was <trip>?", the recap numbers and the
 * passport stamps. Choices in decisions/features/11-finish-trip.md.
 *
 * The passport (`passportStamps`) is also what the globe, lifetime stats and stamp screens
 * (KAN-49/50/51) read: a country is "visited" once a finished trip had a stop there.
 */

/** Home asks "How was <trip>?" for trips that ended up to this many days ago. */
export const FINISH_ASK_DAYS = 30;

/** Words under the suns, from 1 to 5. */
export const ratingWords = ['Not great', 'Okay', 'Good', 'Great', 'Amazing'] as const;

export function ratingWord(rating: number): string {
  return ratingWords[rating - 1] ?? '';
}

/** A trip can be finished once it has dates and has started (by hand early, or after the end). */
export function canFinish(trip: Trip, today: IsoDate): boolean {
  return (
    !trip.deletedAt &&
    trip.status !== 'finished' &&
    !!trip.startDate &&
    !!trip.endDate &&
    today >= trip.startDate
  );
}

/**
 * The trip Home asks about: not finished, its last day is over (the day after the end date),
 * at most FINISH_ASK_DAYS ago. The one that ended last comes first.
 */
export function finishPrompt(trips: Trip[], today: IsoDate): Trip | null {
  const ended = trips.filter(
    (t) =>
      canFinish(t, today) &&
      t.endDate! < today &&
      daysBetween(t.endDate!, today) <= FINISH_ASK_DAYS,
  );
  ended.sort((a, b) => (a.endDate! > b.endDate! ? -1 : a.endDate! < b.endDate! ? 1 : 0));
  return ended[0] ?? null;
}

/** One stamp in the passport: the first finished trip that went to that country. */
export interface PassportStamp {
  countryCode: string;
  tripId: string;
  /** The last day of that trip. */
  date: IsoDate;
}

/** Finished trips in the order they happened (last day, then when they were finished). */
function finishedInOrder(trips: Trip[]): Trip[] {
  return trips
    .filter((t) => !t.deletedAt && t.status === 'finished' && t.endDate)
    .sort(
      (a, b) =>
        a.endDate!.localeCompare(b.endDate!) ||
        (a.finishedAt ?? '').localeCompare(b.finishedAt ?? '') ||
        a.id.localeCompare(b.id),
    );
}

/** Every country of a finished trip, once, oldest first. Derived, never stored (data model). */
export function passportStamps(
  trips: Trip[],
  stopsByTrip: ReadonlyMap<string, TripStop[]>,
): PassportStamp[] {
  const seen = new Set<string>();
  const stamps: PassportStamp[] = [];
  for (const t of finishedInOrder(trips)) {
    for (const code of tripCountries(stopsByTrip.get(t.id) ?? [])) {
      if (seen.has(code)) continue;
      seen.add(code);
      stamps.push({ countryCode: code, tripId: t.id, date: t.endDate! });
    }
  }
  return stamps;
}

/** "NOV 2026", as printed on a stamp. */
export function stampDate(date: IsoDate): string {
  const [y, m] = date.split('-').map(Number);
  const month = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, 1)).toLocaleString('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  });
  return `${month.slice(0, 3).toUpperCase()} ${y}`;
}

export interface TripRecap {
  /** Days from the first to the last day, both counted. */
  days: number;
  placesVisited: number;
  photos: number;
  /** Spent, in the home currency's minor units (expenses still converting are left out). */
  spentMinor: number;
  /** Expenses whose rate is not on the phone yet. */
  spentPending: number;
  /** Countries of this trip, in trip order. */
  countries: string[];
  /**
   * Countries this trip added to the passport: no other finished trip went there. A trip finished
   * later than another trip to the same country never counts it as new, even when its dates are older.
   */
  newCountries: string[];
  /** Countries in the passport, this trip included. */
  countriesTotal: number;
}

export function tripRecap(input: {
  trip: Trip;
  stops: TripStop[];
  places: Place[];
  photoCount: number;
  spent: { totalHome: number; pending: number };
  allTrips: Trip[];
  stopsByTrip: ReadonlyMap<string, TripStop[]>;
}): TripRecap {
  const { trip, stops, places, photoCount, spent, allTrips, stopsByTrip } = input;
  const countries = tripCountries(stops);
  const stamps = passportStamps(allTrips, stopsByTrip);
  const stampedBefore = new Set(
    passportStamps(
      allTrips.filter((t) => t.id !== trip.id),
      stopsByTrip,
    ).map((s) => s.countryCode),
  );
  const newCountries = countries.filter((code) => !stampedBefore.has(code));
  return {
    days: trip.startDate && trip.endDate ? daysBetween(trip.startDate, trip.endDate) + 1 : 0,
    placesVisited: places.filter((p) => !p.deletedAt && p.status === 'visited').length,
    photos: photoCount,
    spentMinor: spent.totalHome,
    spentPending: spent.pending,
    countries,
    newCountries,
    countriesTotal: stamps.length,
  };
}
