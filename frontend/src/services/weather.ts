import { api } from '@/api/client';
import type { Trip, TripStop } from '@/data/types';
import { todayIso } from '@/lib/dates';
import {
  weatherRequests,
  weatherRequestsKey,
  type StopWeather,
  type TripWeather,
  type WeatherDay,
  type WeatherRequest,
} from '@/lib/weather';

import { getDeviceValue, setDeviceValue } from './deviceStorage';

/**
 * Weather for a trip's stops (KAN-28), from our server (GET /weather/days, Open-Meteo behind it).
 * The phone keeps the last answer per trip, so the packing list still shows weather offline.
 * Only weather numbers and stop ids are kept, never city names or positions. Nothing is logged.
 */
const CACHE = 'weather';
/** The server refreshes forecasts every 3 hours; asking more often gives the same answer. */
const FRESH_MS = 3 * 60 * 60 * 1000;
const MAX_TRIPS = 20;
/** After a failed call, wait a minute before asking again (every list change reloads the screen). */
const RETRY_MS = 60 * 1000;
const lastFailure = new Map<string, number>();

interface CacheEntry {
  key: string;
  fetchedAt: string;
  stops: StopWeather[];
  attribution: string;
  attributionUrl: string;
}

type Cache = Record<string, CacheEntry>;

function readCache(): Cache {
  try {
    const raw = getDeviceValue(CACHE);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache) {
  const kept = Object.entries(cache)
    .sort(([, a], [, b]) => b.fetchedAt.localeCompare(a.fetchedAt))
    .slice(0, MAX_TRIPS);
  try {
    setDeviceValue(CACHE, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // A full or broken store only means no offline weather.
  }
}

/** Called when the logged-in user changes: the next user never sees this user's weather. */
export function clearWeatherCache() {
  lastFailure.clear();
  try {
    setDeviceValue(CACHE, '{}');
  } catch {
    // Nothing kept.
  }
}

interface DaysAnswer {
  days: WeatherDay[];
  attribution: string;
  attributionUrl: string;
}

/** One stop's days from the server, or null when the call fails (offline, server down). */
export type FetchDays = (r: WeatherRequest) => Promise<DaysAnswer | null>;

const fetchDaysFromApi: FetchDays = async (r) => {
  try {
    const { data, response } = await api.GET('/weather/days', {
      params: { query: { lat: r.lat, lng: r.lng, from: r.from, to: r.to } },
    });
    if (!response.ok || !data) return null;
    return {
      days: data.days.map((d) => ({
        date: d.date,
        kind: d.kind === 'typical' ? 'typical' : 'forecast',
        minC: Number(d.minC),
        maxC: Number(d.maxC),
        precipitationMm: Number(d.precipitationMm),
        precipitationChance: d.precipitationChance == null ? null : Number(d.precipitationChance),
        snowCm: Number(d.snowCm),
      })),
      attribution: data.attribution,
      attributionUrl: data.attributionUrl,
    };
  } catch {
    return null;
  }
};

/**
 * The weather of a trip's stops: the kept answer while it is fresh, else a new one from the
 * server, else the last kept one marked stale. Null when there is none (no positions or dates,
 * or offline before the first answer).
 */
export async function getTripWeather(
  trip: Pick<Trip, 'id' | 'startDate'>,
  stops: TripStop[],
  { now = new Date(), fetchDays = fetchDaysFromApi }: { now?: Date; fetchDays?: FetchDays } = {},
): Promise<TripWeather | null> {
  const today = todayIso(now);
  const requests = weatherRequests(trip, stops, today);
  if (!requests.length) return null;
  const key = weatherRequestsKey(requests);
  const cache = readCache();
  const stored = cache[trip.id]?.key === key ? cache[trip.id] : undefined;
  // Days already over are not shown (the trip is on and the phone was offline for a while).
  const kept = stored && {
    ...stored,
    stops: stored.stops.map((s) => ({ ...s, days: s.days.filter((d) => d.date >= today) })),
  };
  if (kept && now.getTime() - Date.parse(kept.fetchedAt) < FRESH_MS) {
    return { ...kept, stale: false };
  }

  const failedAt = lastFailure.get(trip.id);
  if (failedAt !== undefined && now.getTime() - failedAt < RETRY_MS) {
    return kept ? { ...kept, stale: true } : null;
  }
  const answers = await Promise.all(requests.map(fetchDays));
  if (!answers.every((a) => a !== null)) {
    lastFailure.set(trip.id, now.getTime());
    return kept ? { ...kept, stale: true } : null;
  }
  lastFailure.delete(trip.id);

  const entry: CacheEntry = {
    key,
    fetchedAt: now.toISOString(),
    stops: requests.map((r, i) => ({ stopId: r.stopId, days: answers[i]!.days })),
    attribution: answers[0]!.attribution,
    attributionUrl: answers[0]!.attributionUrl,
  };
  writeCache({ ...readCache(), [trip.id]: entry });
  return { ...entry, stale: false };
}
