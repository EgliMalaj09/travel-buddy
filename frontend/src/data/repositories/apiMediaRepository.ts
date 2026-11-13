import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { cleanNote, sortPhotos } from '@/lib/photos';

import { notifyDataChanged } from '../changes';
import type { Media } from '../types';
import { createHttpTripApi, type SyncChange, type TripApi } from './apiTripRepository';
import { checkNote, checkPhoto, newPhotoColumns, type MediaRepository } from './mediaRepository';

type Schemas = components['schemas'];

/** The backend calls this repository needs. Tests pass a fake. */
export interface MediaApi {
  /** GET /media?tripId= ; null when the trip is not found. */
  list(tripId: string): Promise<Schemas['MediaDto'][] | null>;
  upload: TripApi['upload'];
}

const OFFLINE = "Can't reach the server. Check your connection and try again.";

export function createHttpMediaApi(): MediaApi {
  return {
    async list(tripId) {
      let result;
      try {
        result = await api.GET('/media', { params: { query: { tripId } } });
      } catch {
        throw new Error(OFFLINE);
      }
      if (result.response.status === 404) return null;
      if (result.response.status === 401) throw new Error('Please log in again.');
      if (!result.data) throw new Error('The server could not load the photos. Please try again.');
      return result.data.media;
    },
    upload: createHttpTripApi().upload,
  };
}

const n = (v: number | string | null): number | null => (v == null ? null : Number(v));

export function toMedia(m: Schemas['MediaDto']): Media {
  return {
    ...m,
    tripId: m.tripId ?? '',
    mediaType: m.mediaType as Media['mediaType'],
    purpose: m.purpose as Media['purpose'],
    scope: m.scope as Media['scope'],
    source: m.source as Media['source'],
    qualityTier: m.qualityTier as Media['qualityTier'],
    lat: n(m.lat),
    lng: n(m.lng),
    width: Number(m.width),
    height: Number(m.height),
    sizeBytes: n(m.sizeBytes),
    sortOrder: n(m.sortOrder),
    version: Number(m.version),
  };
}

/**
 * Photo records on the server (web preview, or EXPO_PUBLIC_DATA_MODE=api). Reads GET /media,
 * writes POST /sync/upload. Adding photos needs the phone app (files are kept on the phone first);
 * here the records are shown, notes can be changed and photos deleted.
 */
export function createApiMediaRepository(
  mediaApi: MediaApi = createHttpMediaApi(),
): MediaRepository {
  const byTrip = new Map<string, Media[]>();

  async function load(tripId: string): Promise<Media[]> {
    const media = sortPhotos(((await mediaApi.list(tripId)) ?? []).map(toMedia));
    byTrip.set(tripId, media);
    return media;
  }

  const find = (id: string) => [...byTrip.values()].flat().find((m) => m.id === id) ?? null;

  async function send(changes: SyncChange[], tripId: string | null) {
    try {
      const results = await mediaApi.upload(changes);
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

  async function reload(id: string, tripId: string): Promise<Media> {
    const photo = (await load(tripId)).find((m) => m.id === id);
    if (!photo) throw new Error('The photo was not saved. Please try again.');
    return photo;
  }

  return {
    reset() {
      byTrip.clear();
    },
    listPhotos: load,
    async getPhoto(id) {
      return find(id);
    },
    async listWaitingUploads() {
      return [];
    },
    async listAllIds() {
      return [];
    },
    async addPhoto(tripId, input) {
      checkPhoto(input);
      await send(
        [{ op: 'PUT', type: 'media', id: input.id, data: newPhotoColumns(tripId, input) }],
        tripId,
      );
      return reload(input.id, tripId);
    },
    async updateNote(id, note) {
      checkNote(note);
      const tripId = find(id)?.tripId;
      if (!tripId) throw new Error('Photo not found.');
      await send([{ op: 'PATCH', type: 'media', id, data: { caption: cleanNote(note) } }], tripId);
      return reload(id, tripId);
    },
    async deletePhoto(id) {
      await send([{ op: 'DELETE', type: 'media', id }], find(id)?.tripId ?? null);
    },
  };
}
