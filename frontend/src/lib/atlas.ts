import type { IsoDate, Trip, TripStop } from '@/data/types';
import {
  COUNTRY_POINTS,
  GLOBE_COLS,
  GLOBE_ROWS,
  GLOBE_RUNS,
  GLOBE_STEP,
} from '@/data/static/globeLand';

import { addDays } from './dates';
import { currentStop } from './home';
import { passportStamps, type PassportStamp } from './finishTrip';
import { tripCountries, tripGroup } from './trips';

/**
 * Atlas (KAN-49/50/51), pure logic: lifetime stats, the visited-countries list, and the dotted
 * globe (orthographic projection, no library). Visited = the passport from Finish trip (KAN-47):
 * a country of a finished trip. Everything is computed on the phone, never stored (data model).
 * Choices in decisions/features/12-atlas.md.
 */

/** Countries in the world for "12 of 195" (UN members and observers). */
export const WORLD_COUNTRIES = 195;

export interface LifetimeStats {
  /** Countries in the passport. */
  countries: number;
  /** Finished trips. */
  trips: number;
  /** Different days away on finished trips (overlapping trips count each day once). */
  days: number;
}

const finished = (trips: Trip[]) =>
  trips.filter((t) => !t.deletedAt && t.status === 'finished' && t.startDate && t.endDate);

/** Every day from start to end, both included. Long trips are capped to stay cheap. */
function eachDay(start: IsoDate, end: IsoDate, into: Set<IsoDate>): void {
  let d = start;
  for (let i = 0; d <= end && i < 1000; i++) {
    into.add(d);
    d = addDays(d, 1);
  }
}

export function lifetimeStats(
  trips: Trip[],
  stopsByTrip: ReadonlyMap<string, TripStop[]>,
): LifetimeStats {
  const done = finished(trips);
  const days = new Set<IsoDate>();
  for (const t of done) eachDay(t.startDate!, t.endDate!, days);
  return {
    countries: passportStamps(trips, stopsByTrip).length,
    trips: done.length,
    days: days.size,
  };
}

export interface VisitedCountry {
  code: string;
  /** Finished trips that had a stop there. */
  trips: number;
  /** Last day of the latest of those trips. */
  lastDate: IsoDate;
}

/** Visited countries, the most trips first, then the latest visit, then the code. */
export function visitedCountries(
  trips: Trip[],
  stopsByTrip: ReadonlyMap<string, TripStop[]>,
): VisitedCountry[] {
  const byCode = new Map<string, VisitedCountry>();
  for (const t of finished(trips)) {
    for (const code of tripCountries(stopsByTrip.get(t.id) ?? [])) {
      const row = byCode.get(code);
      if (!row) byCode.set(code, { code, trips: 1, lastDate: t.endDate! });
      else {
        row.trips++;
        if (t.endDate! > row.lastDate) row.lastDate = t.endDate!;
      }
    }
  }
  return [...byCode.values()].sort(
    (a, b) =>
      b.trips - a.trips || b.lastDate.localeCompare(a.lastDate) || a.code.localeCompare(b.code),
  );
}

/** The country the user is in today (a trip on now), shown in "sun" on the globe. */
export function hereNow(
  trips: Trip[],
  stopsByTrip: ReadonlyMap<string, TripStop[]>,
  today: IsoDate,
): string | null {
  const now = trips.find((t) => !t.deletedAt && tripGroup(t, today) === 'now');
  if (!now) return null;
  return currentStop(now, stopsByTrip.get(now.id) ?? [], today)?.countryCode ?? null;
}

/** Newest stamp first: the passport strip on the Atlas. */
export function newestFirst(stamps: PassportStamp[]): PassportStamp[] {
  return [...stamps].reverse();
}

// ── The dotted globe ─────────────────────────────────────────────────────────────────────

/** One land dot: where it is on the sphere and its country ("" when the land has no code). */
export interface GlobeDot {
  lng: number;
  sinLat: number;
  cosLat: number;
  code: string;
}

/** Below this latitude (Antarctica) no dots are drawn: never visited, and it saves work. */
const SOUTH_LIMIT = -60;

const rad = (deg: number) => (deg * Math.PI) / 180;

const dot = (lngDeg: number, latDeg: number, code: string): GlobeDot => ({
  lng: rad(lngDeg),
  sinLat: Math.sin(rad(latDeg)),
  cosLat: Math.cos(rad(latDeg)),
  code,
});

let cache: GlobeDot[] | null = null;

/** The land dots, decoded once from the generated data (src/data/static/globeLand.ts). */
export function globeDots(): GlobeDot[] {
  if (cache) return cache;
  const dots: GlobeDot[] = [];
  const seen = new Set<string>();
  let i = 0;
  for (const run of GLOBE_RUNS.split(' ')) {
    const code = run.slice(0, 2);
    const n = Number(run.slice(2)) || 1;
    if (code !== '..') {
      for (let j = 0; j < n; j++) {
        const k = i + j;
        const lat = 90 - GLOBE_STEP * (Math.floor(k / GLOBE_COLS) + 0.5);
        if (lat < SOUTH_LIMIT) continue;
        const lng = -180 + GLOBE_STEP * ((k % GLOBE_COLS) + 0.5);
        const c = code === '~~' ? '' : code;
        if (c) seen.add(c);
        dots.push(dot(lng, lat, c));
      }
    }
    i += n;
  }
  if (i !== GLOBE_ROWS * GLOBE_COLS) throw new Error('globe data is damaged');
  // Countries too small for the grid (Malta, Andorra, Singapore, …) get one dot at their label.
  for (const [code, [lng, lat]] of Object.entries(COUNTRY_POINTS)) {
    if (!seen.has(code)) dots.push(dot(lng, lat, code));
  }
  cache = dots;
  return dots;
}

/** Where the globe turns to show a country: its label point, or null when unknown. */
export function countryPoint(code: string): { lng: number; lat: number } | null {
  const p = COUNTRY_POINTS[code];
  return p ? { lng: p[0], lat: p[1] } : null;
}

/** The view: the point of the sphere in the middle (degrees). */
export interface GlobeView {
  lng: number;
  lat: number;
}

/** Latitude of the middle is kept inside this range, so the globe never turns upside down. */
export const TILT_LIMIT = 70;

export function clampView(v: GlobeView): GlobeView {
  const lng = ((((v.lng + 180) % 360) + 360) % 360) - 180;
  return { lng, lat: Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, v.lat)) };
}

export interface GlobePaths {
  /** SVG path data, dots as tiny round-capped lines, by depth (far, middle, near). */
  land: [string, string, string];
  visited: string;
  here: string;
}

/**
 * Projects the visible dots for one view onto a square of `size` (orthographic projection) and
 * returns them as a few SVG paths, so the screen draws five shapes instead of thousands.
 */
export function globePaths(
  view: GlobeView,
  size: number,
  visited: ReadonlySet<string>,
  here: string | null,
): GlobePaths {
  const r = size * 0.46;
  const c = size / 2;
  const lng0 = rad(view.lng);
  const sin0 = Math.sin(rad(view.lat));
  const cos0 = Math.cos(rad(view.lat));
  const land: [string[], string[], string[]] = [[], [], []];
  const hit: string[] = [];
  const now: string[] = [];
  for (const d of globeDots()) {
    const dl = d.lng - lng0;
    const cosDl = Math.cos(dl);
    const z = sin0 * d.sinLat + cos0 * d.cosLat * cosDl;
    if (z <= 0.02) continue; // the back of the globe
    const x = c + r * d.cosLat * Math.sin(dl);
    const y = c - r * (cos0 * d.sinLat - sin0 * d.cosLat * cosDl);
    const seg = `M${x.toFixed(1)} ${y.toFixed(1)}h.01`;
    if (d.code && d.code === here) now.push(seg);
    else if (d.code && visited.has(d.code)) hit.push(seg);
    else land[z < 0.4 ? 0 : z < 0.75 ? 1 : 2].push(seg);
  }
  return {
    land: [land[0].join(''), land[1].join(''), land[2].join('')],
    visited: hit.join(''),
    here: now.join(''),
  };
}
