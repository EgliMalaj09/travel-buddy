import { todayIso } from '@/lib/dates';
import { newId } from '@/lib/ids';

import { notifyDataChanged } from '../changes';
import { buildMockData } from '../mock/mockTrips';
import type { Flight, IsoDate, SyncFields, Trip, TripActivity, TripStop } from '../types';

/** A stop as the create/edit form sends it. `id` is set when editing an existing stop. */
export type StopInput = Pick<
  TripStop,
  'countryCode' | 'cityName' | 'lat' | 'lng' | 'geoProviderId' | 'nights'
> & { id?: string };

/** A flight as the form sends it. `id` is set when editing an existing flight. */
export type FlightInput = Omit<Flight, 'id' | 'tripId' | 'order' | keyof SyncFields> & {
  id?: string;
};

export interface TripInput {
  name: string;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  activities: TripActivity[];
  /** In trip order. */
  stops: StopInput[];
  /** In list order. */
  flights: FlightInput[];
}

/** Copied from the logged-in user when a trip is created. */
export interface TripOwner {
  ownerId: string;
  passportCountry: string;
  homeCurrency: string;
}

/**
 * Screens never talk to the network or the database directly: they call a repository.
 * Today there is one implementation (mock, in memory). The local-database implementation
 * (PowerSync) replaces it in "FE - Offline sync" (KAN-15) without changing any screen.
 */
export interface TripRepository {
  listTrips(): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | null>;
  listStops(tripId: string): Promise<TripStop[]>;
  listFlights(tripId: string): Promise<Flight[]>;
  createTrip(input: TripInput, owner: TripOwner): Promise<Trip>;
  updateTrip(id: string, input: TripInput): Promise<Trip>;
  /**
   * Finish trip (KAN-47): status finished, the time, the rating and the note, in one change.
   * Only a trip with dates that has started (`finishTripProblem`).
   */
  finishTrip(id: string, input: FinishInput): Promise<Trip>;
  /** Opens a finished trip again (status planned). The rating and note stay for next time. */
  reopenTrip(id: string): Promise<Trip>;
  /** Soft delete of the trip and everything in it (T6: the screen asks first). */
  deleteTrip(id: string): Promise<void>;
  /** Forgets anything loaded so far (another user logged in). */
  reset?(): void;
}

/** What the Finish trip screen sends. */
export interface FinishInput {
  /** 1 to 5. */
  rating: number;
  /** Optional, up to FINISH_NOTE_MAX characters. */
  note: string | null;
}

export const FINISH_NOTE_MAX = 200;

/** The same checks the backend makes when a trip is finished (TripsService.CheckFinish). */
export function finishTripProblem(trip: Trip, input: FinishInput, today: IsoDate): string | null {
  if (!trip.startDate || !trip.endDate) return 'Add the dates of the trip before you finish it.';
  if (today < trip.startDate) return 'This trip has not started yet.';
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    return 'Pick from 1 to 5 suns.';
  if ((input.note?.trim().length ?? 0) > FINISH_NOTE_MAX)
    return `The note can be up to ${FINISH_NOTE_MAX} characters.`;
  return null;
}

/** The note as it is saved: trimmed, empty means none. */
export const cleanFinishNote = (note: string | null) => note?.trim() || null;

/** Checks a finish and throws the problem, so every repository answers the same. */
export function checkFinish(trip: Trip | null, input: FinishInput, at: string): asserts trip {
  if (!trip) throw new Error('Trip not found.');
  const problem = finishTripProblem(trip, input, todayIso(new Date(at)));
  if (problem) throw new Error(problem);
}

/** The same checks the backend's sync write endpoint makes (Create a trip, Technical). */
export function tripInputProblem(input: TripInput): string | null {
  if (!input.name.trim()) return 'The trip needs a name.';
  if (input.name.trim().length > 120) return 'The name can be up to 120 characters.';
  if (input.stops.length === 0) return 'Add at least one stop.';
  if (input.stops.some((s) => s.nights < 0 || !Number.isInteger(s.nights)))
    return 'Nights must be 0 or more.';
  if (input.stops.some((s) => !s.cityName.trim() || !s.countryCode))
    return 'Every stop needs a city and a country.';
  if (!input.startDate !== !input.endDate) return 'Pick both the first and the last day.';
  if (input.startDate && input.endDate && input.endDate < input.startDate)
    return 'The last day is before the first day.';
  return null;
}

export function createMockTripRepository(
  data: { trips: Trip[]; stops: TripStop[]; flights: Flight[] } = buildMockData(),
  now: () => string = () => new Date().toISOString(),
): TripRepository {
  const live = <T extends SyncFields>(rows: T[]) => rows.filter((r) => !r.deletedAt);
  const fresh = (): SyncFields => {
    const at = now();
    return { createdAt: at, updatedAt: at, deletedAt: null, version: 1 };
  };
  const touch = <T extends SyncFields>(row: T, changes: Partial<T>): T => ({
    ...row,
    ...changes,
    updatedAt: now(),
    version: row.version + 1,
  });

  function check(input: TripInput) {
    const problem = tripInputProblem(input);
    if (problem) throw new Error(problem);
  }

  /** Writes the stops and flights of a trip: updates the kept ones, adds new, removes the rest. */
  function writeChildren(tripId: string, input: TripInput) {
    const keepStops = new Set(input.stops.map((s) => s.id).filter(Boolean));
    data.stops = data.stops.map((s) =>
      s.tripId === tripId && !s.deletedAt && !keepStops.has(s.id)
        ? touch(s, { deletedAt: now() })
        : s,
    );
    input.stops.forEach((s, order) => {
      const fields = {
        order,
        countryCode: s.countryCode,
        cityName: s.cityName.trim(),
        lat: s.lat,
        lng: s.lng,
        geoProviderId: s.geoProviderId,
        nights: s.nights,
      };
      const i = data.stops.findIndex((x) => x.id === s.id && x.tripId === tripId);
      if (i >= 0) data.stops[i] = touch(data.stops[i]!, fields);
      else data.stops.push({ id: newId(), tripId, ...fields, ...fresh() });
    });

    const keepFlights = new Set(input.flights.map((f) => f.id).filter(Boolean));
    data.flights = data.flights.map((f) =>
      f.tripId === tripId && !f.deletedAt && !keepFlights.has(f.id)
        ? touch(f, { deletedAt: now() })
        : f,
    );
    input.flights.forEach(({ id, ...f }, order) => {
      const i = data.flights.findIndex((x) => x.id === id && x.tripId === tripId);
      if (i >= 0) data.flights[i] = touch(data.flights[i]!, { ...f, order });
      else data.flights.push({ ...f, id: newId(), tripId, order, ...fresh() });
    });
  }

  return {
    async listTrips() {
      return live(data.trips);
    },
    async getTrip(id) {
      return live(data.trips).find((t) => t.id === id) ?? null;
    },
    async listStops(tripId) {
      return live(data.stops)
        .filter((s) => s.tripId === tripId)
        .sort((a, b) => a.order - b.order);
    },
    async listFlights(tripId) {
      return live(data.flights)
        .filter((f) => f.tripId === tripId)
        .sort((a, b) => a.order - b.order);
    },
    async createTrip(input, owner) {
      check(input);
      const trip: Trip = {
        id: newId(),
        ownerId: owner.ownerId,
        name: input.name.trim(),
        type: 'solo',
        startDate: input.startDate,
        endDate: input.endDate,
        activities: input.activities,
        status: 'planned',
        finishedAt: null,
        rating: null,
        finishNote: null,
        coverMediaId: null,
        passportCountrySnapshot: owner.passportCountry,
        homeCurrencySnapshot: owner.homeCurrency,
        checklistGeneratedAt: null,
        checklistRulesVersion: null,
        anniversaryEnabled: true,
        ...fresh(),
      };
      data.trips.push(trip);
      writeChildren(trip.id, input);
      notifyDataChanged();
      return trip;
    },
    async updateTrip(id, input) {
      check(input);
      const i = data.trips.findIndex((t) => t.id === id && !t.deletedAt);
      if (i < 0) throw new Error('Trip not found.');
      const trip = touch(data.trips[i]!, {
        name: input.name.trim(),
        startDate: input.startDate,
        endDate: input.endDate,
        activities: input.activities,
      });
      data.trips[i] = trip;
      writeChildren(id, input);
      notifyDataChanged();
      return trip;
    },
    async finishTrip(id, input) {
      const i = data.trips.findIndex((t) => t.id === id && !t.deletedAt);
      const at = now();
      checkFinish(data.trips[i] ?? null, input, at);
      const trip = touch(data.trips[i]!, {
        status: 'finished',
        finishedAt: at,
        rating: input.rating,
        finishNote: cleanFinishNote(input.note),
      });
      data.trips[i] = trip;
      notifyDataChanged();
      return trip;
    },
    async reopenTrip(id) {
      const i = data.trips.findIndex((t) => t.id === id && !t.deletedAt);
      if (i < 0) throw new Error('Trip not found.');
      const trip = touch(data.trips[i]!, { status: 'planned', finishedAt: null });
      data.trips[i] = trip;
      notifyDataChanged();
      return trip;
    },
    async deleteTrip(id) {
      const at = now();
      const del = <T extends SyncFields & { tripId?: string; id: string }>(
        rows: T[],
        key: 'id' | 'tripId',
      ) =>
        rows.map((r) =>
          r[key] === id && !r.deletedAt ? touch(r, { deletedAt: at } as Partial<T>) : r,
        );
      data.trips = del(data.trips as (Trip & { tripId?: string })[], 'id');
      data.stops = del(data.stops, 'tripId');
      data.flights = del(data.flights, 'tripId');
      notifyDataChanged();
    },
  };
}
