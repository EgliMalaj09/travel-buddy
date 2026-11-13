import { cleanNote, photoNoteProblem, sortPhotos } from '@/lib/photos';

import { notifyDataChanged } from '../changes';
import type { Media, SyncFields } from '../types';

/** A new photo as the add flow sends it, after the files are saved on the phone. */
export interface PhotoInput {
  /** Chosen before the files are saved, because they are kept under this id. */
  id: string;
  source: 'camera' | 'library';
  width: number;
  height: number;
  takenAt: string | null;
  /** SHA-256 of the original, lowercase hex. */
  contentHash: string;
  caption: string | null;
}

/**
 * Photos of a trip (KAN-39). Screens never talk to the network or the database directly.
 * Implementations: local database (PowerSync, phones), API (web preview), mock (memory).
 */
export interface MediaRepository {
  /** The trip's photos, newest first. */
  listPhotos(tripId: string): Promise<Media[]>;
  getPhoto(id: string): Promise<Media | null>;
  /** Photos this person added that the server does not have the file of yet (all trips). */
  listWaitingUploads(userId: string): Promise<Media[]>;
  /** Every photo id on this phone (to remove files of photos that are gone). */
  listAllIds(): Promise<string[]>;
  addPhoto(tripId: string, input: PhotoInput, userId: string): Promise<Media>;
  updateNote(id: string, note: string | null): Promise<Media>;
  deletePhoto(id: string): Promise<void>;
  /** Forgets anything loaded so far (another user logged in). */
  reset?(): void;
}

export const CONTENT_HASH = /^[0-9a-f]{64}$/;

/** The same checks the backend makes for a new photo. */
export function photoInputProblem(input: PhotoInput): string | null {
  if (!Number.isInteger(input.width) || input.width < 1 || input.width > 20000)
    return 'The photo size could not be read.';
  if (!Number.isInteger(input.height) || input.height < 1 || input.height > 20000)
    return 'The photo size could not be read.';
  if (!CONTENT_HASH.test(input.contentHash)) return 'The photo could not be read.';
  if (input.takenAt && Number.isNaN(Date.parse(input.takenAt))) return 'The photo date is wrong.';
  return photoNoteProblem(input.caption);
}

export function checkPhoto(input: PhotoInput): void {
  const problem = photoInputProblem(input);
  if (problem) throw new Error(problem);
}

export function checkNote(note: string | null): void {
  const problem = photoNoteProblem(note);
  if (problem) throw new Error(problem);
}

/** Columns the phone writes for a new photo (snake_case, as on the server and in PowerSync). */
export function newPhotoColumns(tripId: string, input: PhotoInput) {
  return {
    trip_id: tripId,
    place_id: null,
    media_type: 'photo',
    purpose: 'trip_photo',
    scope: 'shared',
    source: input.source,
    is_suggested: 0,
    caption: cleanNote(input.caption),
    taken_at: input.takenAt,
    // The photo's position is never read (P-e).
    lat: null,
    lng: null,
    country_code: null,
    width: input.width,
    height: input.height,
    mime_type: 'image/jpeg',
    duration_sec: null,
    content_hash: input.contentHash,
    quality_tier: 'compressed',
    include_in_video: 1,
    sort_order: null,
  };
}

/** A new photo as a record, before the server has seen it. */
export function newPhoto(tripId: string, input: PhotoInput, userId: string, at: string): Media {
  const sync: SyncFields = { createdAt: at, updatedAt: at, deletedAt: null, version: 0 };
  return {
    id: input.id,
    ownerUserId: userId,
    tripId,
    placeId: null,
    mediaType: 'photo',
    purpose: 'trip_photo',
    scope: 'shared',
    source: input.source,
    isSuggested: false,
    caption: cleanNote(input.caption),
    takenAt: input.takenAt,
    lat: null,
    lng: null,
    countryCode: null,
    width: input.width,
    height: input.height,
    mimeType: 'image/jpeg',
    contentHash: input.contentHash,
    qualityTier: 'compressed',
    fileKey: null,
    thumbnailKey: null,
    sizeBytes: null,
    uploadedAt: null,
    includeInVideo: true,
    sortOrder: null,
    ...sync,
  };
}

export const DUPLICATE_PHOTO = 'This photo is already in the trip.';

/** Photos in memory (mock mode), gone after a reload. Files are never uploaded. */
export function createMockMediaRepository(
  data: { media: Media[] } = { media: [] },
  now: () => string = () => new Date().toISOString(),
): MediaRepository {
  const live = () => data.media.filter((m) => !m.deletedAt);
  const find = (id: string) => live().find((m) => m.id === id) ?? null;
  return {
    async listPhotos(tripId) {
      return sortPhotos(live().filter((m) => m.tripId === tripId));
    },
    async getPhoto(id) {
      return find(id);
    },
    async listWaitingUploads() {
      // Mock mode has no server.
      return [];
    },
    async listAllIds() {
      return data.media.map((m) => m.id);
    },
    async addPhoto(tripId, input, userId) {
      checkPhoto(input);
      if (live().some((m) => m.tripId === tripId && m.contentHash === input.contentHash))
        throw new Error(DUPLICATE_PHOTO);
      const photo = newPhoto(tripId, input, userId, now());
      data.media.push(photo);
      notifyDataChanged();
      return photo;
    },
    async updateNote(id, note) {
      checkNote(note);
      const old = find(id);
      if (!old) throw new Error('Photo not found.');
      const next = { ...old, caption: cleanNote(note), updatedAt: now(), version: old.version + 1 };
      data.media = data.media.map((m) => (m.id === id ? next : m));
      notifyDataChanged();
      return next;
    },
    async deletePhoto(id) {
      if (!find(id)) return;
      data.media = data.media.map((m) => (m.id === id ? { ...m, deletedAt: now() } : m));
      notifyDataChanged();
    },
  };
}
