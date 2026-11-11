import type { Flight, FlightDirection, IsoDate, Trip, TripActivity, TripStop } from '@/data/types';
import type { FlightInput, TripInput } from '@/data/repositories/tripRepository';
import { findCountry } from '@/data/static/countries';

import { daysBetween } from './dates';

/**
 * The create / edit trip form ("draft") and its rules (Create a trip, T1–T7).
 * Pure functions, so the rules are tested without screens.
 */

export interface StopDraft {
  /** Stable key for lists; equals `id` for stops that already exist. */
  key: string;
  id?: string;
  cityName: string;
  countryCode: string;
  lat: number | null;
  lng: number | null;
  geoProviderId: string | null;
  nights: number;
}

/** Text fields are '' when empty; they become null when saved. */
export interface FlightDraft {
  key: string;
  id?: string;
  direction: FlightDirection;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: IsoDate | null;
  /** "HH:MM" */
  departureTime: string;
  arrivalDate: IsoDate | null;
  arrivalTime: string;
  departureTimeZone: string | null;
  arrivalTimeZone: string | null;
  bookingCode: string;
  seat: string;
  terminal: string;
}

export interface TripDraft {
  stops: StopDraft[];
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  /** "I don't know yet" (T4): the trip goes to Someday. */
  noDates: boolean;
  flights: FlightDraft[];
  activities: TripActivity[];
  name: string;
  /** Once the user types a name, it no longer follows the stops. */
  nameEdited: boolean;
}

export const emptyDraft: TripDraft = {
  stops: [],
  startDate: null,
  endDate: null,
  noDates: false,
  flights: [],
  activities: [],
  name: '',
  nameEdited: false,
};

export const activityLabels: Record<TripActivity, string> = {
  beach: 'Beach',
  city: 'City',
  culture: 'Culture',
  food: 'Food',
  hiking: 'Hiking',
  skiing: 'Skiing',
  road_trip: 'Road trip',
  business: 'Business',
  relaxing: 'Relaxing',
};

export const directionLabels: Record<FlightDirection, string> = {
  outbound: 'Outbound',
  return: 'Return',
  other: 'Other',
};

/** Default name from the stops (Create a trip, step 4). */
export function defaultTripName(stops: Pick<StopDraft, 'cityName' | 'countryCode'>[]): string {
  const countryName = (code: string) => findCountry(code)?.name ?? code;
  const cities = [...new Set(stops.map((s) => s.cityName.trim()).filter(Boolean))];
  if (cities.length === 0) return '';
  if (cities.length === 1) return cities[0]!;
  if (cities.length === 2) return `${cities[0]} & ${cities[1]}`;
  const countries = [...new Set(stops.map((s) => s.countryCode))];
  if (countries.length === 1) return countryName(countries[0]!);
  if (countries.length === 2)
    return `${countryName(countries[0]!)} & ${countryName(countries[1]!)}`;
  return `${countryName(countries[0]!)}, ${countryName(countries[1]!)} +${countries.length - 2}`;
}

/** The name to show: the user's own, or the default from the stops. */
export function withDefaultName(draft: TripDraft): TripDraft {
  return draft.nameEdited ? draft : { ...draft, name: defaultTripName(draft.stops) };
}

/** Nights between the first and last day, or null without dates. */
export function totalNights(
  draft: Pick<TripDraft, 'startDate' | 'endDate' | 'noDates'>,
): number | null {
  if (draft.noDates || !draft.startDate || !draft.endDate) return null;
  return Math.max(0, daysBetween(draft.startDate, draft.endDate));
}

/**
 * T3: with dates, the last stop takes the nights that are left, so the total always matches.
 * Without dates, nights stay as they are.
 */
export function balanceNights(draft: TripDraft): TripDraft {
  const total = totalNights(draft);
  if (total === null || draft.stops.length === 0) return draft;
  const stops = [...draft.stops];
  const others = stops.slice(0, -1).reduce((sum, s) => sum + s.nights, 0);
  stops[stops.length - 1] = { ...stops[stops.length - 1]!, nights: total - others };
  return { ...draft, stops };
}

/**
 * + / − on a stop. With dates, only stops before the last one have buttons; the last one
 * absorbs the change and never goes below 0.
 */
export function changeNights(draft: TripDraft, index: number, delta: number): TripDraft {
  const stop = draft.stops[index];
  if (!stop) return draft;
  const next = stop.nights + delta;
  if (next < 0) return draft;
  const total = totalNights(draft);
  if (total !== null) {
    if (index === draft.stops.length - 1) return draft;
    const last = draft.stops[draft.stops.length - 1]!;
    if (last.nights - delta < 0) return draft;
  }
  const stops = draft.stops.map((s, i) => (i === index ? { ...s, nights: next } : s));
  return balanceNights({ ...draft, stops });
}

/** New stops get 1 night (or what is left, with dates). */
export function addStop(draft: TripDraft, stop: Omit<StopDraft, 'nights'>): TripDraft {
  const total = totalNights(draft);
  let stops = [...draft.stops, { ...stop, nights: 1 }];
  if (total !== null) {
    // Take one night from the old last stop if it has some to give.
    const prev = draft.stops[draft.stops.length - 1];
    if (prev) {
      const give = prev.nights > 1 ? 1 : 0;
      stops = stops.map((s, i) => (i === stops.length - 2 ? { ...s, nights: s.nights - give } : s));
    }
  }
  return withDefaultName(balanceNights({ ...draft, stops }));
}

export function removeStop(draft: TripDraft, index: number): TripDraft {
  return withDefaultName(
    balanceNights({ ...draft, stops: draft.stops.filter((_, i) => i !== index) }),
  );
}

/** Move a stop up (-1) or down (+1). */
export function moveStop(draft: TripDraft, index: number, step: -1 | 1): TripDraft {
  const to = index + step;
  if (to < 0 || to >= draft.stops.length) return draft;
  const stops = [...draft.stops];
  [stops[index], stops[to]] = [stops[to]!, stops[index]!];
  return withDefaultName(balanceNights({ ...draft, stops }));
}

/** Picking dates: when the trip gets dates, nights are spread out so the total matches. */
export function setDates(
  draft: TripDraft,
  startDate: IsoDate | null,
  endDate: IsoDate | null,
): TripDraft {
  const next = { ...draft, startDate, endDate, noDates: false };
  const total = totalNights(next);
  if (total === null || next.stops.length === 0) return next;
  const others = next.stops.slice(0, -1).reduce((sum, s) => sum + s.nights, 0);
  if (others <= total) return balanceNights(next);
  // Too many nights before the last stop: spread the total evenly instead.
  const n = next.stops.length;
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return {
    ...next,
    stops: next.stops.map((s, i) => ({ ...s, nights: base + (i >= n - extra ? 1 : 0) })),
  };
}

export function setNoDates(draft: TripDraft, noDates: boolean): TripDraft {
  return noDates ? { ...draft, noDates, startDate: null, endDate: null } : { ...draft, noDates };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Problems in one flight, or null. */
export function flightProblem(f: FlightDraft): string | null {
  if (f.departureTime && !TIME.test(f.departureTime))
    return 'Write the departure time as HH:MM, e.g. 09:40.';
  if (f.arrivalTime && !TIME.test(f.arrivalTime))
    return 'Write the arrival time as HH:MM, e.g. 11:05.';
  if (f.departureTime && !f.departureDate) return 'Pick the departure day.';
  if (f.arrivalTime && !f.arrivalDate) return 'Pick the arrival day.';
  if (f.flightNumber.length > 10) return 'The flight number can be up to 10 characters.';
  if (f.bookingCode.length > 12) return 'The booking code can be up to 12 characters.';
  return null;
}

/** What blocks "Next" on each step (1 Where, 2 When, 3 What, 4 Name), or null. */
export function stepProblem(draft: TripDraft, step: 1 | 2 | 3 | 4): string | null {
  if (step === 1) return draft.stops.length === 0 ? 'Add at least one place you will stay.' : null;
  if (step === 2) {
    if (!draft.noDates && (!draft.startDate || !draft.endDate))
      return 'Pick the first and last day, or tap "I don\'t know yet".';
    if (draft.stops.some((s) => s.nights < 0))
      return 'The nights add up to more than the trip. Remove some nights.';
    for (const f of draft.flights) {
      const p = flightProblem(f);
      if (p) return p;
    }
    return null;
  }
  if (step === 4) {
    if (!draft.name.trim()) return 'Give the trip a name.';
    if (draft.name.trim().length > 120) return 'The name can be up to 120 characters.';
  }
  return null;
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);
const localTime = (date: IsoDate | null, time: string) =>
  date ? `${date}T${time || '00:00'}` : null;

export function draftToInput(draft: TripDraft): TripInput {
  const flights: FlightInput[] = draft.flights.map((f) => ({
    id: f.id,
    direction: f.direction,
    airline: orNull(f.airline),
    flightNumber: orNull(f.flightNumber.toUpperCase()),
    departureAirport: orNull(f.departureAirport),
    arrivalAirport: orNull(f.arrivalAirport),
    departureLocalTime: localTime(f.departureDate, f.departureTime),
    arrivalLocalTime: localTime(f.arrivalDate, f.arrivalTime),
    departureTimeZone: f.departureTimeZone,
    arrivalTimeZone: f.arrivalTimeZone,
    bookingCode: orNull(f.bookingCode.toUpperCase()),
    seat: orNull(f.seat.toUpperCase()),
    terminal: orNull(f.terminal),
  }));
  return {
    name: draft.name.trim(),
    startDate: draft.noDates ? null : draft.startDate,
    endDate: draft.noDates ? null : draft.endDate,
    activities: draft.activities,
    stops: draft.stops.map(({ key: _key, ...s }) => s),
    flights,
  };
}

/** The form for editing an existing trip. */
export function draftFromTrip(trip: Trip, stops: TripStop[], flights: Flight[]): TripDraft {
  const split = (t: string | null) =>
    t ? { date: t.slice(0, 10), time: t.slice(11, 16) } : { date: null, time: '' };
  return {
    stops: stops.map((s) => ({
      key: s.id,
      id: s.id,
      cityName: s.cityName,
      countryCode: s.countryCode,
      lat: s.lat,
      lng: s.lng,
      geoProviderId: s.geoProviderId,
      nights: s.nights,
    })),
    startDate: trip.startDate,
    endDate: trip.endDate,
    noDates: !trip.startDate,
    flights: flights.map((f) => {
      const dep = split(f.departureLocalTime);
      const arr = split(f.arrivalLocalTime);
      return {
        key: f.id,
        id: f.id,
        direction: f.direction,
        airline: f.airline ?? '',
        flightNumber: f.flightNumber ?? '',
        departureAirport: f.departureAirport ?? '',
        arrivalAirport: f.arrivalAirport ?? '',
        departureDate: dep.date,
        departureTime: dep.time,
        arrivalDate: arr.date,
        arrivalTime: arr.time,
        departureTimeZone: f.departureTimeZone,
        arrivalTimeZone: f.arrivalTimeZone,
        bookingCode: f.bookingCode ?? '',
        seat: f.seat ?? '',
        terminal: f.terminal ?? '',
      };
    }),
    activities: trip.activities,
    name: trip.name,
    nameEdited: trip.name !== defaultTripName(stops),
  };
}

/** The phone's time zone, e.g. "Europe/Tirane" (used for outbound flights). */
export function phoneTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/** A new, empty flight. Outbound starts on the first day, return on the last. */
export function newFlight(draft: TripDraft, key: string): FlightDraft {
  const hasOutbound = draft.flights.some((f) => f.direction === 'outbound');
  const direction: FlightDirection = !hasOutbound
    ? 'outbound'
    : draft.flights.some((f) => f.direction === 'return')
      ? 'other'
      : 'return';
  const date =
    direction === 'outbound' ? draft.startDate : direction === 'return' ? draft.endDate : null;
  return {
    key,
    direction,
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureDate: date,
    departureTime: '',
    arrivalDate: date,
    arrivalTime: '',
    departureTimeZone: direction === 'outbound' ? phoneTimeZone() : null,
    arrivalTimeZone: null,
    bookingCode: '',
    seat: '',
    terminal: '',
  };
}

/** "W6 4567 · TIA → FCO" style summary for a flight card. */
export function flightTitle(
  f: Pick<Flight, 'airline' | 'flightNumber' | 'departureAirport' | 'arrivalAirport'>,
): string {
  const route =
    f.departureAirport || f.arrivalAirport
      ? `${f.departureAirport ?? '?'} → ${f.arrivalAirport ?? '?'}`
      : '';
  const name = [f.airline, f.flightNumber].filter(Boolean).join(' ');
  return [name, route].filter(Boolean).join(' · ') || 'Flight';
}
