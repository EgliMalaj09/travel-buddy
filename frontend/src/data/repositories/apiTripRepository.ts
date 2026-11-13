import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { newId } from '@/lib/ids';

import { notifyDataChanged } from '../changes';
import type { Flight, Trip, TripActivity, TripStop } from '../types';
import {
  checkFinish,
  cleanFinishNote,
  tripInputProblem,
  type FlightInput,
  type StopInput,
  type TripInput,
  type TripRepository,
} from './tripRepository';

type Schemas = components['schemas'];

/** One waiting change, in the shape PowerSync gives its upload queue (snake_case columns). */
export type SyncChange = {
  op: 'PUT' | 'PATCH' | 'DELETE';
  type:
    | 'trips'
    | 'trip_stops'
    | 'flights'
    | 'places'
    | 'checklist_items'
    | 'expenses'
    | 'media'
    | 'user_settings';
  id: string;
  data?: Record<string, unknown>;
};

export type SyncResult = Schemas['SyncChangeResult'];

/** The two backend calls this repository needs. Tests pass a fake. */
export interface TripApi {
  /** GET /trips, one page. Pass the previous page's nextCursor as `after`. */
  list(after?: string): Promise<Schemas['MyTripsResponse']>;
  /** POST /sync/upload */
  upload(changes: SyncChange[]): Promise<SyncResult[]>;
}

/** Trips per GET /trips page (the API allows up to 100). */
export const TRIPS_PAGE_SIZE = 50;
/** Safety stop, so a server bug that keeps sending a cursor can't loop forever (= 10,000 trips). */
const MAX_PAGES = 200;

const OFFLINE = "Can't reach the server. Check your connection and try again.";

/** Calls the real API (openapi-fetch client with the login token). */
export function createHttpTripApi(): TripApi {
  async function call<T>(
    run: () => Promise<{ data?: T; error?: unknown; response: Response }>,
  ): Promise<T> {
    let result;
    try {
      result = await run();
    } catch {
      throw new Error(OFFLINE);
    }
    if (result.response.status === 401) throw new Error('Please log in again.');
    if (!result.data) throw new Error('The server could not save this. Please try again.');
    return result.data;
  }
  return {
    list: (after) =>
      call(() =>
        api.GET('/trips', {
          params: { query: { limit: TRIPS_PAGE_SIZE, ...(after ? { after } : {}) } },
        }),
      ),
    upload: async (changes) =>
      (
        await call(() =>
          // The OpenAPI file describes "data" as an object without listed columns (they differ per table).
          api.POST('/sync/upload', { body: { changes: changes as Schemas['SyncChange'][] } }),
        )
      ).results,
  };
}

/** Columns the phone writes. Server-only columns (owner, sync fields) are never sent. */
const tripColumns = (input: TripInput) => ({
  name: input.name.trim(),
  start_date: input.startDate,
  end_date: input.endDate,
  activities: input.activities,
});

const stopColumns = (tripId: string, order: number, s: StopInput) => ({
  trip_id: tripId,
  order,
  country_code: s.countryCode,
  city_name: s.cityName.trim(),
  lat: s.lat,
  lng: s.lng,
  geo_provider_id: s.geoProviderId,
  nights: s.nights,
});

const flightColumns = (tripId: string, order: number, f: FlightInput) => ({
  trip_id: tripId,
  order,
  direction: f.direction,
  airline: f.airline,
  flight_number: f.flightNumber,
  departure_airport: f.departureAirport,
  arrival_airport: f.arrivalAirport,
  departure_local_time: f.departureLocalTime,
  arrival_local_time: f.arrivalLocalTime,
  departure_time_zone: f.departureTimeZone,
  arrival_time_zone: f.arrivalTimeZone,
  booking_code: f.bookingCode,
  seat: f.seat,
  terminal: f.terminal,
});

const num = (v: number | string) => Number(v);

function toTrip(t: Schemas['TripDto']): Trip {
  return {
    ...t,
    type: t.type as Trip['type'],
    status: t.status as Trip['status'],
    activities: t.activities as TripActivity[],
    rating: t.rating == null ? null : num(t.rating),
    version: num(t.version),
  };
}

function toStop(s: Schemas['TripStopDto']): TripStop {
  return {
    ...s,
    order: num(s.order),
    nights: num(s.nights),
    lat: s.lat == null ? null : num(s.lat),
    lng: s.lng == null ? null : num(s.lng),
    version: num(s.version),
  };
}

/** The API sends "2027-04-12T09:40:00"; the app keeps local airport times as "2027-04-12T09:40". */
const localTime = (v: string | null) => (v ? v.slice(0, 16) : null);

function toFlight(f: Schemas['FlightDto']): Flight {
  return {
    ...f,
    order: num(f.order),
    direction: f.direction as Flight['direction'],
    departureLocalTime: localTime(f.departureLocalTime),
    arrivalLocalTime: localTime(f.arrivalLocalTime),
    version: num(f.version),
  };
}

type Snapshot = { trips: Trip[]; stops: TripStop[]; flights: Flight[] };

/** Reads GET /trips page by page until nextCursor is empty. Pages come in trip order. */
async function listAllPages(tripApi: TripApi): Promise<Schemas['MyTripsResponse']> {
  const all: Schemas['MyTripsResponse'] = { trips: [], stops: [], flights: [], nextCursor: null };
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const r = await tripApi.list(after);
    all.trips.push(...r.trips);
    all.stops.push(...r.stops);
    all.flights.push(...r.flights);
    if (!r.nextCursor) return all;
    after = r.nextCursor;
  }
  throw new Error('Too many trips to load. Please try again.');
}

/**
 * Trips saved on the server (KAN-16): reads GET /trips, writes POST /sync/upload.
 * A step before PowerSync (KAN-15): the writes already use the sync endpoint and its change format,
 * so only the reading side changes when the phone gets its local database. Until then the app
 * needs the connection to load and save trips.
 */
export function createApiTripRepository(tripApi: TripApi = createHttpTripApi()): TripRepository {
  let cache: Promise<Snapshot> | null = null;

  function load(fresh = false): Promise<Snapshot> {
    if (!cache || fresh) {
      const next = listAllPages(tripApi).then((r) => ({
        trips: r.trips.map(toTrip),
        stops: r.stops.map(toStop).sort((a, b) => a.order - b.order),
        flights: r.flights.map(toFlight).sort((a, b) => a.order - b.order),
      }));
      // A failed load is not kept, so the next screen tries again.
      next.catch(() => {
        if (cache === next) cache = null;
      });
      cache = next;
    }
    return cache;
  }

  async function send(changes: SyncChange[]) {
    try {
      const results = await tripApi.upload(changes);
      const rejected = results.find((r) => r.status !== 'ok');
      if (rejected) {
        const message = Object.values(rejected.problems ?? {})[0]?.[0];
        throw new Error(message ?? 'The server could not save this.');
      }
    } finally {
      // Some changes may be saved even when one is rejected: read again either way.
      cache = null;
      notifyDataChanged();
    }
  }

  function check(input: TripInput) {
    const problem = tripInputProblem(input);
    if (problem) throw new Error(problem);
  }

  /** Stops and flights: change the kept ones, add new ones, then remove the rest (a trip keeps 1+ stop). */
  function childChanges(tripId: string, input: TripInput, current: Snapshot): SyncChange[] {
    const upserts: SyncChange[] = [];
    const deletes: SyncChange[] = [];
    const oldStops = current.stops.filter((s) => s.tripId === tripId);
    const oldFlights = current.flights.filter((f) => f.tripId === tripId);
    const has = (rows: { id: string }[], id?: string) => !!id && rows.some((r) => r.id === id);

    input.stops.forEach((s, order) => {
      const data = stopColumns(tripId, order, s);
      upserts.push(
        has(oldStops, s.id)
          ? { op: 'PATCH', type: 'trip_stops', id: s.id!, data }
          : { op: 'PUT', type: 'trip_stops', id: newId(), data },
      );
    });
    input.flights.forEach((f, order) => {
      const data = flightColumns(tripId, order, f);
      upserts.push(
        has(oldFlights, f.id)
          ? { op: 'PATCH', type: 'flights', id: f.id!, data }
          : { op: 'PUT', type: 'flights', id: newId(), data },
      );
    });
    const keepStops = new Set(input.stops.map((s) => s.id));
    const keepFlights = new Set(input.flights.map((f) => f.id));
    for (const s of oldStops)
      if (!keepStops.has(s.id)) deletes.push({ op: 'DELETE', type: 'trip_stops', id: s.id });
    for (const f of oldFlights)
      if (!keepFlights.has(f.id)) deletes.push({ op: 'DELETE', type: 'flights', id: f.id });
    return [...upserts, ...deletes];
  }

  return {
    reset() {
      cache = null;
    },
    async listTrips() {
      return (await load(true)).trips;
    },
    async getTrip(id) {
      return (await load()).trips.find((t) => t.id === id) ?? null;
    },
    async listStops(tripId) {
      return (await load()).stops.filter((s) => s.tripId === tripId);
    },
    async listFlights(tripId) {
      return (await load()).flights.filter((f) => f.tripId === tripId);
    },
    async createTrip(input, owner) {
      check(input);
      const id = newId();
      await send([
        {
          op: 'PUT',
          type: 'trips',
          id,
          data: {
            ...tripColumns(input),
            type: 'solo',
            status: 'planned',
            passport_country_snapshot: owner.passportCountry,
            home_currency_snapshot: owner.homeCurrency,
            anniversary_enabled: true,
          },
        },
        ...childChanges(id, input, { trips: [], stops: [], flights: [] }),
      ]);
      const trip = (await load()).trips.find((t) => t.id === id);
      if (!trip) throw new Error('The trip was not saved. Please try again.');
      return trip;
    },
    async updateTrip(id, input) {
      check(input);
      const current = await load(true);
      if (!current.trips.some((t) => t.id === id)) throw new Error('Trip not found.');
      await send([
        { op: 'PATCH', type: 'trips', id, data: tripColumns(input) },
        ...childChanges(id, input, current),
      ]);
      const trip = (await load()).trips.find((t) => t.id === id);
      if (!trip) throw new Error('Trip not found.');
      return trip;
    },
    async finishTrip(id, input) {
      const current = await load(true);
      const at = new Date().toISOString();
      checkFinish(current.trips.find((t) => t.id === id) ?? null, input, at);
      await send([
        {
          op: 'PATCH',
          type: 'trips',
          id,
          data: {
            status: 'finished',
            finished_at: at,
            rating: input.rating,
            finish_note: cleanFinishNote(input.note),
          },
        },
      ]);
      const trip = (await load()).trips.find((t) => t.id === id);
      if (!trip) throw new Error('Trip not found.');
      return trip;
    },
    async reopenTrip(id) {
      await send([
        { op: 'PATCH', type: 'trips', id, data: { status: 'planned', finished_at: null } },
      ]);
      const trip = (await load()).trips.find((t) => t.id === id);
      if (!trip) throw new Error('Trip not found.');
      return trip;
    },
    async deleteTrip(id) {
      // The server removes the trip's stops and flights with it.
      await send([{ op: 'DELETE', type: 'trips', id }]);
    },
  };
}
