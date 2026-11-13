import type { IsoDate, Place, PlaceCategory, Trip, TripStop } from '@/data/types';

import { addDays, daysBetween, formatDay } from './dates';
import { stopDates } from './trips';

/** Places (KAN-34): helpers for planned places on trip days. */

export const categoryLabels: Record<PlaceCategory, string> = {
  sight: 'Sight',
  food: 'Food',
  stay: 'Stay',
  transport: 'Transport',
  other: 'Other',
};

/** Ionicons names, one per category. */
export const categoryIcons = {
  sight: 'camera-outline',
  food: 'restaurant-outline',
  stay: 'bed-outline',
  transport: 'bus-outline',
  other: 'location-outline',
} as const satisfies Record<PlaceCategory, string>;

/** The order categories are offered in the form. */
export const categoryOrder: PlaceCategory[] = ['sight', 'food', 'stay', 'transport', 'other'];

/** Every day of the trip, first to last. Empty for a Someday trip. */
export function tripDays(trip: Pick<Trip, 'startDate' | 'endDate'>): IsoDate[] {
  if (!trip.startDate || !trip.endDate || trip.endDate < trip.startDate) return [];
  const count = Math.min(daysBetween(trip.startDate, trip.endDate), 365) + 1;
  return Array.from({ length: count }, (_, i) => addDays(trip.startDate!, i));
}

/** "Day 2 · Tue 13 Apr", or just "Tue 13 Apr" for a date outside the trip. */
export function dayLabel(trip: Pick<Trip, 'startDate' | 'endDate'>, date: IsoDate): string {
  const inside = trip.startDate && trip.endDate && date >= trip.startDate && date <= trip.endDate;
  return inside
    ? `Day ${daysBetween(trip.startDate!, date) + 1} · ${formatDay(date)}`
    : formatDay(date);
}

/**
 * The stop the traveller is in on that day: where they slept the night before, or arrive that day.
 * The last day of the trip belongs to the last stop. "Any day" (null), a Someday trip or a day
 * outside the trip gives the first stop.
 */
export function stopForDay(
  trip: Pick<Trip, 'startDate' | 'endDate'>,
  stops: TripStop[],
  date: IsoDate | null,
): TripStop | null {
  const live = stops.filter((s) => !s.deletedAt);
  const dated = stopDates(trip.startDate, live);
  if (dated.length === 0) return null;
  if (date && trip.startDate) {
    const during = dated.find(
      ({ arrive, leave }) => arrive && leave && arrive <= date && date < leave,
    );
    if (during) return during.stop;
    if (trip.endDate && date === trip.endDate) return dated[dated.length - 1]!.stop;
  }
  return dated[0]!.stop;
}

/**
 * Where a new or changed place is (Places, 12 Nov 2026, €0 rule): the city of that day's stop.
 * An exact spot comes later with the Map (KAN-37).
 */
export function locationForDay(
  trip: Pick<Trip, 'startDate' | 'endDate'>,
  stops: TripStop[],
  date: IsoDate | null,
): { countryCode: string; cityName: string | null; lat: number | null; lng: number | null } | null {
  const stop = stopForDay(trip, stops, date);
  if (!stop) return null;
  const hasPosition = stop.lat != null && stop.lng != null;
  return {
    countryCode: stop.countryCode,
    cityName: stop.cityName,
    lat: hasPosition ? stop.lat : null,
    lng: hasPosition ? stop.lng : null,
  };
}

export interface PlaceDay {
  /** null = "Any day" */
  date: IsoDate | null;
  label: string;
  places: Place[];
}

/** The trip page list: one group per day that has places, in date order, then "Any day". */
export function groupPlacesByDay(
  trip: Pick<Trip, 'startDate' | 'endDate'>,
  places: Place[],
): PlaceDay[] {
  const days = new Map<string, Place[]>();
  for (const p of places) {
    if (p.deletedAt) continue;
    const key = p.plannedDate ?? '';
    days.set(key, [...(days.get(key) ?? []), p]);
  }
  return [...days.keys()]
    .sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a < b ? -1 : a > b ? 1 : 0))
    .map((key) => ({
      date: key || null,
      label: key ? dayLabel(trip, key) : 'Any day',
      places: days.get(key)!,
    }));
}

/** Planned places for that day, not yet visited first. */
export function placesOn(places: Place[], date: IsoDate): Place[] {
  return places
    .filter((p) => !p.deletedAt && p.plannedDate === date)
    .sort((a, b) => Number(a.status === 'visited') - Number(b.status === 'visited'));
}
