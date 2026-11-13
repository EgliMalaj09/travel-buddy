import type { Flight, IsoDate, Trip, TripStop } from '@/data/types';

import { daysBetween, formatDay } from './dates';
import { groupTrips, stopDates } from './trips';

/**
 * Pure helpers for the Home dashboard. Kept out of the screen so they can be tested
 * and so they work the same with mock data and with the local database.
 */

export type HomeFocus = { trip: Trip; kind: 'now' | 'upcoming' };

/** The trip Home is about: the one happening now, otherwise the next one with dates. */
export function homeFocus(trips: Trip[], today: IsoDate): HomeFocus | null {
  const groups = groupTrips(trips, today);
  const now = groups.find((g) => g.group === 'now')?.trips[0];
  if (now) return { trip: now, kind: 'now' };
  const next = groups.find((g) => g.group === 'upcoming')?.trips[0];
  return next ? { trip: next, kind: 'upcoming' } : null;
}

/** The big number on the hero card: "23 days" to go, or "Day 3 of 7". */
export function countdown(
  focus: HomeFocus,
  today: IsoDate,
): { value: string; label: string } | null {
  const { trip, kind } = focus;
  if (!trip.startDate || !trip.endDate) return null;
  if (kind === 'upcoming') {
    const days = daysBetween(today, trip.startDate);
    return { value: String(days), label: days === 1 ? 'day to go' : 'days to go' };
  }
  const day = daysBetween(trip.startDate, today) + 1;
  const total = daysBetween(trip.startDate, trip.endDate) + 1;
  return { value: `Day ${day}`, label: `of ${total}` };
}

/**
 * Where the user sleeps tonight on a trip that is happening now.
 * On the last day (after the last night) it is the last stop.
 */
export function currentStop(trip: Trip, stops: TripStop[], today: IsoDate): TripStop | null {
  const dated = stopDates(trip.startDate, stops);
  const hit = dated.find(
    ({ arrive, leave }) => arrive && leave && arrive <= today && today < leave,
  );
  return hit?.stop ?? dated[dated.length - 1]?.stop ?? null;
}

/** The next flight that has a departure time, from today on. */
export function nextFlight(flights: Flight[], today: IsoDate): Flight | null {
  return (
    flights
      .filter((f) => f.departureLocalTime && f.departureLocalTime.slice(0, 10) >= today)
      .sort((a, b) => (a.departureLocalTime! < b.departureLocalTime! ? -1 : 1))[0] ?? null
  );
}

/** "Mon 12 Apr · 09:40" (local time at the airport). */
export function formatFlightTime(localTime: string): string {
  const time = localTime.slice(11, 16);
  return time ? `${formatDay(localTime.slice(0, 10))} · ${time}` : formatDay(localTime);
}

/** "Good morning" / "Good afternoon" / "Good evening" from the hour (0–23). */
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
