import type { IsoDate, IsoDateTime, Trip, TripStop } from '@/data/types';

import { addDays } from './dates';
import { stopDates } from './trips';

/**
 * Weather for the packing list (KAN-28). The server gets it from Open-Meteo (agreed 13 Nov 2026)
 * through GET /weather/days: a real forecast for the next ~16 days, and "typical" weather (the same
 * dates in the last 3 years) for trips further away. Pure helpers here; fetching and the cache on
 * the phone are in services/weather.ts.
 */
export type WeatherKind = 'forecast' | 'typical';

export interface WeatherDay {
  date: IsoDate;
  kind: WeatherKind;
  minC: number;
  maxC: number;
  precipitationMm: number;
  /** 0–100. For typical days: how many of the past years had rain that day. */
  precipitationChance: number | null;
  snowCm: number;
}

/** What the phone asks the server for one stop. Coordinates are rounded to about 11 km. */
export interface WeatherRequest {
  stopId: string;
  lat: number;
  lng: number;
  from: IsoDate;
  to: IsoDate;
  /** The stop's own dates ("arrive..leave"), for the cache key: they do not move with today. */
  span: string;
}

export interface StopWeather {
  stopId: string;
  days: WeatherDay[];
}

export interface TripWeather {
  stops: StopWeather[];
  fetchedAt: IsoDateTime;
  /** True when the phone could not refresh it (offline) and shows the last weather it had. */
  stale: boolean;
  attribution: string;
  attributionUrl: string;
}

/**
 * The server takes at most 31 days per call and up to 400 days ahead of its (UTC) today. A little
 * less here, so a phone ahead of UTC never asks one day too far.
 */
const MAX_DAYS = 31;
const MAX_AHEAD = 398;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * One request per stop that has a position and dates still to come. A stop's days run from the
 * day you arrive to the day you leave (today at the earliest), at most 31 days.
 */
export function weatherRequests(
  trip: Pick<Trip, 'startDate'>,
  stops: TripStop[],
  today: IsoDate,
): WeatherRequest[] {
  const out: WeatherRequest[] = [];
  const last = addDays(today, MAX_AHEAD);
  for (const { stop, arrive, leave } of stopDates(trip.startDate, stops)) {
    if (!arrive || !leave || stop.lat == null || stop.lng == null) continue;
    if (leave < today || arrive > last) continue;
    const from = arrive < today ? today : arrive;
    let to = leave > last ? last : leave;
    if (to > addDays(from, MAX_DAYS - 1)) to = addDays(from, MAX_DAYS - 1);
    out.push({
      stopId: stop.id,
      lat: round1(stop.lat),
      lng: round1(stop.lng),
      from,
      to,
      span: `${arrive}..${leave}`,
    });
  }
  return out;
}

/**
 * Changes when the stops, their places or dates change, so old weather is not shown for them.
 * It does not change as the days of the trip pass, so offline during the trip the phone still
 * shows what it had (past days are dropped when shown).
 */
export const weatherRequestsKey = (requests: WeatherRequest[]) =>
  requests.map((r) => `${r.stopId}@${r.lat},${r.lng}:${r.span}`).join('|');

/** A day counts as rainy at 50 % or more, or (no chance given) 1 mm or more. */
export const isRainy = (d: WeatherDay) =>
  d.precipitationChance != null ? d.precipitationChance >= 50 : d.precipitationMm >= 1;
export const isSnowy = (d: WeatherDay) => d.snowCm >= 0.5;

export interface WeatherSummary {
  minC: number;
  maxC: number;
  rainyDays: number;
  snowyDays: number;
  days: number;
  /** "mixed" when the first days are a forecast and the later ones typical. */
  kind: WeatherKind | 'mixed';
}

export function summarize(days: WeatherDay[]): WeatherSummary | null {
  if (!days.length) return null;
  const kinds = new Set(days.map((d) => d.kind));
  return {
    minC: Math.min(...days.map((d) => d.minC)),
    maxC: Math.max(...days.map((d) => d.maxC)),
    rainyDays: days.filter(isRainy).length,
    snowyDays: days.filter(isSnowy).length,
    days: days.length,
    kind: kinds.size > 1 ? 'mixed' : [...kinds][0]!,
  };
}

/** Celsius to the user's unit (Settings, KAN-21), rounded. */
export function temperature(celsius: number, unit: 'C' | 'F' = 'C'): number {
  return Math.round(unit === 'F' ? (celsius * 9) / 5 + 32 : celsius);
}

/** "9–18°C · rain likely on 2 days" (or °F when the user chose Fahrenheit). */
export function summaryLine(s: WeatherSummary, unit: 'C' | 'F' = 'C'): string {
  const parts = [`${temperature(s.minC, unit)}–${temperature(s.maxC, unit)}°${unit}`];
  if (s.snowyDays) parts.push(s.snowyDays === 1 ? 'snow on 1 day' : `snow on ${s.snowyDays} days`);
  if (s.rainyDays)
    parts.push(s.rainyDays === 1 ? 'rain likely on 1 day' : `rain likely on ${s.rainyDays} days`);
  else if (!s.snowyDays) parts.push('mostly dry');
  return parts.join(' · ');
}

export const weatherKindLabel: Record<WeatherSummary['kind'], string> = {
  forecast: 'Forecast',
  typical: 'Typical for these dates (past years)',
  mixed: 'Forecast, then typical for later days',
};

/** What the packing rules need to know about the weather of the whole trip. */
export interface WeatherConditions {
  /** False when there is no weather (offline the first time, no city positions, no dates). */
  known: boolean;
  cold: boolean;
  freezing: boolean;
  hot: boolean;
  rain: boolean;
  snow: boolean;
}

export const unknownWeather: WeatherConditions = {
  known: false,
  cold: false,
  freezing: false,
  hot: false,
  rain: false,
  snow: false,
};

/**
 * Cold: a low under 10°C. Freezing: a low of 2°C or less. Hot: a high of 26°C or more.
 * Rain: a forecast day at 60 % or more, or rain on at least a fifth of the days. Snow: any snowy day.
 */
export function weatherConditions(weather: TripWeather | null): WeatherConditions {
  const days = weather?.stops.flatMap((s) => s.days) ?? [];
  if (!days.length) return unknownWeather;
  const rainy = days.filter(isRainy).length;
  return {
    known: true,
    cold: days.some((d) => d.minC < 10),
    freezing: days.some((d) => d.minC <= 2),
    hot: days.some((d) => d.maxC >= 26),
    rain:
      rainy / days.length >= 0.2 ||
      days.some((d) => d.kind === 'forecast' && (d.precipitationChance ?? 0) >= 60),
    snow: days.some(isSnowy),
  };
}
