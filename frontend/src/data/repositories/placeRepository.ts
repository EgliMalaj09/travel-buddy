import { newId } from '@/lib/ids';

import { notifyDataChanged } from '../changes';
import type { IsoDate, Place, PlaceCategory, SyncFields } from '../types';

/** A place as the add/edit form sends it. */
export interface PlaceInput {
  title: string;
  note: string | null;
  category: PlaceCategory;
  /** A day of the trip, or null for "any day". */
  plannedDate: IsoDate | null;
  /** Where it is: today the city of that day's stop (no paid place search, €0 rule). */
  countryCode: string;
  cityName: string | null;
  lat: number | null;
  lng: number | null;
}

/**
 * Places of a trip (KAN-34). Screens never talk to the network or the database directly.
 * Implementations: local database (PowerSync, phones), API (web preview), mock (memory).
 */
export interface PlaceRepository {
  /** The trip's places: by planned day, "any day" last, then in the order they were added. */
  listPlaces(tripId: string): Promise<Place[]>;
  getPlace(id: string): Promise<Place | null>;
  createPlace(tripId: string, input: PlaceInput, userId: string): Promise<Place>;
  updatePlace(id: string, input: PlaceInput): Promise<Place>;
  /** "Been there" on or off: visited ↔ planned (a visited place can go back to planned). */
  setVisited(id: string, visited: boolean): Promise<void>;
  deletePlace(id: string): Promise<void>;
  /** Forgets anything loaded so far (another user logged in). */
  reset?(): void;
}

export const PLACE_TITLE_MAX = 120;
export const PLACE_NOTE_MAX = 2000;

/** The same checks the backend makes (PlacesService.Check). */
export function placeInputProblem(input: PlaceInput): string | null {
  if (!input.title.trim()) return 'The place needs a name.';
  if (input.title.trim().length > PLACE_TITLE_MAX)
    return `The name can be up to ${PLACE_TITLE_MAX} characters.`;
  if ((input.note ?? '').length > PLACE_NOTE_MAX)
    return `The note can be up to ${PLACE_NOTE_MAX} characters.`;
  if (!/^[A-Z]{2}$/.test(input.countryCode)) return 'The place needs a country.';
  if ((input.lat == null) !== (input.lng == null)) return 'The map position is incomplete.';
  return null;
}

export function checkPlace(input: PlaceInput): void {
  const problem = placeInputProblem(input);
  if (problem) throw new Error(problem);
}

/** Sort used by every implementation: by day, "any day" last, then by when it was added. */
export function sortPlaces(places: Place[]): Place[] {
  return [...places].sort((a, b) => {
    if (a.plannedDate !== b.plannedDate) {
      if (!a.plannedDate) return 1;
      if (!b.plannedDate) return -1;
      return a.plannedDate < b.plannedDate ? -1 : 1;
    }
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Columns the phone writes for a place (snake_case, as on the server and in PowerSync). */
export function placeColumns(input: PlaceInput) {
  return {
    title: input.title.trim(),
    note: input.note?.trim() ? input.note.trim() : null,
    category: input.category,
    planned_date: input.plannedDate,
    country_code: input.countryCode,
    city_name: input.cityName,
    lat: input.lat,
    lng: input.lng,
  };
}

/** Columns only set when a place is created on a trip. */
export function newPlaceColumns(tripId: string) {
  return {
    trip_id: tripId,
    scope: 'shared',
    status: 'planned',
    source: 'manual',
    is_suggested: 0,
    address: null,
    geo_provider_id: null,
    visited_at: null,
    cover_media_id: null,
    copied_from_place_id: null,
  };
}

/** Places in memory (mock mode), gone after a reload. */
export function createMockPlaceRepository(
  data: { places: Place[] } = { places: [] },
  now: () => string = () => new Date().toISOString(),
): PlaceRepository {
  const live = () => data.places.filter((p) => !p.deletedAt);
  const find = (id: string) => live().find((p) => p.id === id) ?? null;
  const touch = (id: string, changes: Partial<Place>) => {
    data.places = data.places.map((p) =>
      p.id === id ? { ...p, ...changes, updatedAt: now(), version: p.version + 1 } : p,
    );
    notifyDataChanged();
  };
  const fields = (input: PlaceInput) => ({
    title: input.title.trim(),
    note: input.note?.trim() ? input.note.trim() : null,
    category: input.category,
    plannedDate: input.plannedDate,
    countryCode: input.countryCode,
    cityName: input.cityName,
    lat: input.lat,
    lng: input.lng,
  });

  return {
    async listPlaces(tripId) {
      return sortPlaces(live().filter((p) => p.tripId === tripId));
    },
    getPlace: async (id) => find(id),
    async createPlace(tripId, input, userId) {
      checkPlace(input);
      const at = now();
      const sync: SyncFields = { createdAt: at, updatedAt: at, deletedAt: null, version: 1 };
      const place: Place = {
        id: newId(),
        tripId,
        createdByUserId: userId,
        ownerUserId: null,
        scope: 'shared',
        status: 'planned',
        address: null,
        geoProviderId: null,
        visitedAt: null,
        source: 'manual',
        isSuggested: false,
        coverMediaId: null,
        copiedFromPlaceId: null,
        ...fields(input),
        ...sync,
      };
      data.places.push(place);
      notifyDataChanged();
      return place;
    },
    async updatePlace(id, input) {
      checkPlace(input);
      if (!find(id)) throw new Error('Place not found.');
      touch(id, fields(input));
      return find(id)!;
    },
    async setVisited(id, visited) {
      if (!find(id)) throw new Error('Place not found.');
      touch(
        id,
        visited ? { status: 'visited', visitedAt: now() } : { status: 'planned', visitedAt: null },
      );
    },
    async deletePlace(id) {
      if (find(id)) touch(id, { deletedAt: now() });
    },
  };
}
