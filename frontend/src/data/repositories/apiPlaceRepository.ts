import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { newId } from '@/lib/ids';

import { notifyDataChanged } from '../changes';
import type { Place } from '../types';
import { createHttpTripApi, type SyncChange, type TripApi } from './apiTripRepository';
import {
  checkPlace,
  newPlaceColumns,
  placeColumns,
  sortPlaces,
  type PlaceRepository,
} from './placeRepository';

type Schemas = components['schemas'];

/** The backend calls this repository needs. Tests pass a fake. */
export interface PlaceApi {
  /** GET /places?tripId= ; null when the trip is not found. */
  list(tripId: string): Promise<Schemas['PlaceDto'][] | null>;
  upload: TripApi['upload'];
}

const OFFLINE = "Can't reach the server. Check your connection and try again.";

export function createHttpPlaceApi(): PlaceApi {
  return {
    async list(tripId) {
      let result;
      try {
        result = await api.GET('/places', { params: { query: { tripId } } });
      } catch {
        throw new Error(OFFLINE);
      }
      if (result.response.status === 404) return null;
      if (result.response.status === 401) throw new Error('Please log in again.');
      if (!result.data) throw new Error('The server could not load the places. Please try again.');
      return result.data.places;
    },
    upload: createHttpTripApi().upload,
  };
}

const num = (v: number | string) => Number(v);

export function toPlace(p: Schemas['PlaceDto']): Place {
  return {
    ...p,
    scope: p.scope as Place['scope'],
    status: p.status as Place['status'],
    category: p.category as Place['category'],
    source: p.source as Place['source'],
    lat: p.lat == null ? null : num(p.lat),
    lng: p.lng == null ? null : num(p.lng),
    version: num(p.version),
  };
}

/**
 * Places on the server (web preview, or EXPO_PUBLIC_DATA_MODE=api): reads GET /places, writes
 * POST /sync/upload in the same change format the phone's offline queue uses. Needs the connection.
 */
export function createApiPlaceRepository(
  placeApi: PlaceApi = createHttpPlaceApi(),
): PlaceRepository {
  /** The places of the trips loaded so far, by trip. */
  const byTrip = new Map<string, Place[]>();

  async function load(tripId: string): Promise<Place[]> {
    const places = sortPlaces(((await placeApi.list(tripId)) ?? []).map(toPlace));
    byTrip.set(tripId, places);
    return places;
  }

  const cached = (id: string) => [...byTrip.values()].flat().find((p) => p.id === id) ?? null;

  async function send(changes: SyncChange[], tripId: string | null) {
    try {
      const results = await placeApi.upload(changes);
      const rejected = results.find((r) => r.status !== 'ok');
      if (rejected) {
        const message = Object.values(rejected.problems ?? {})[0]?.[0];
        throw new Error(message ?? 'The server could not save this.');
      }
    } finally {
      if (tripId) byTrip.delete(tripId);
      notifyDataChanged();
    }
  }

  async function reload(id: string, tripId: string | null): Promise<Place> {
    const place = tripId ? (await load(tripId)).find((p) => p.id === id) : null;
    if (!place) throw new Error('The place was not saved. Please try again.');
    return place;
  }

  return {
    reset() {
      byTrip.clear();
    },
    listPlaces: load,
    async getPlace(id) {
      return cached(id);
    },
    async createPlace(tripId, input) {
      checkPlace(input);
      const id = newId();
      await send(
        [
          {
            op: 'PUT',
            type: 'places',
            id,
            data: { ...newPlaceColumns(tripId), is_suggested: false, ...placeColumns(input) },
          },
        ],
        tripId,
      );
      return reload(id, tripId);
    },
    async updatePlace(id, input) {
      checkPlace(input);
      const tripId = cached(id)?.tripId ?? null;
      await send([{ op: 'PATCH', type: 'places', id, data: placeColumns(input) }], tripId);
      return reload(id, tripId);
    },
    async setVisited(id, visited) {
      const tripId = cached(id)?.tripId ?? null;
      await send(
        [
          {
            op: 'PATCH',
            type: 'places',
            id,
            data: visited
              ? { status: 'visited', visited_at: new Date().toISOString() }
              : { status: 'planned', visited_at: null },
          },
        ],
        tripId,
      );
    },
    async deletePlace(id) {
      await send([{ op: 'DELETE', type: 'places', id }], cached(id)?.tripId ?? null);
    },
  };
}
