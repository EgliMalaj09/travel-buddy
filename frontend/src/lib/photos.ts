import type { IsoDate, Media, Trip } from '@/data/types';

import { todayIso } from './dates';
import { expenseDayLabel } from './expenses';

/** Longest side of the photo the app keeps and uploads ("compressed" tier, P-c). */
export const PHOTO_MAX_SIDE = 2048;
/** JPEG quality of the kept photo (0–1). */
export const PHOTO_QUALITY = 0.8;
/** Longest side of the small picture used in the grid. */
export const THUMB_MAX_SIDE = 400;
export const THUMB_QUALITY = 0.7;
/** How many photos can be picked from the library at once. */
export const PICK_LIMIT = 20;
/** The note on a photo (same limit as the server). */
export const PHOTO_NOTE_MAX = 2000;

/** The size to resize to so the longest side is at most `max` (never bigger than the original). */
export function fitSize(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: max, height: max };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * When the photo was taken, from its EXIF data ("2026:11:13 10:42:05", with "+02:00" when the
 * camera wrote the offset). Without an offset the time is read as this phone's local time.
 * Only the time is read: the photo's GPS position is never read or kept (P-e).
 */
export function exifTakenAt(exif: Record<string, unknown> | null | undefined): string | null {
  if (!exif) return null;
  const raw = exif.DateTimeOriginal ?? exif.DateTimeDigitized ?? exif.DateTime;
  if (typeof raw !== 'string') return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  if (y < 1970 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const offset = exif.OffsetTimeOriginal ?? exif.OffsetTime;
  if (typeof offset === 'string' && /^[+-]\d{2}:\d{2}$/.test(offset)) {
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${offset}`;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  const local = new Date(y, mo - 1, d, h, mi, s);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

/** The moment that orders a photo: when it was taken, else when it was added. */
export const photoTime = (m: Pick<Media, 'takenAt' | 'createdAt'>) => m.takenAt ?? m.createdAt;

/** Newest first, like the rest of the trip page. */
export function sortPhotos<T extends Pick<Media, 'takenAt' | 'createdAt' | 'id'>>(media: T[]): T[] {
  return [...media].sort((a, b) => {
    const at = Date.parse(photoTime(b)) - Date.parse(photoTime(a));
    if (at) return at;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** The local day of a photo on this phone. */
export const photoDay = (m: Pick<Media, 'takenAt' | 'createdAt'>): IsoDate =>
  todayIso(new Date(photoTime(m)));

export interface PhotoDay {
  date: IsoDate;
  /** "Today · Day 3 · Marrakesh" style label, the same as the expenses. */
  label: string;
  photos: Media[];
}

/** Photos by local day, newest day first. */
export function groupPhotosByDay(
  trip: Pick<Trip, 'startDate' | 'endDate'>,
  media: Media[],
  today: IsoDate,
): PhotoDay[] {
  const days = new Map<IsoDate, Media[]>();
  for (const m of sortPhotos(media.filter((x) => !x.deletedAt))) {
    const day = photoDay(m);
    days.set(day, [...(days.get(day) ?? []), m]);
  }
  return [...days.keys()]
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((date) => ({ date, label: expenseDayLabel(trip, date, today), photos: days.get(date)! }));
}

/** The note as it is saved: trimmed, empty becomes null. */
export const cleanNote = (note: string | null | undefined) => (note?.trim() ? note.trim() : null);

export function photoNoteProblem(note: string | null | undefined): string | null {
  return (note ?? '').trim().length > PHOTO_NOTE_MAX
    ? `The note can be up to ${PHOTO_NOTE_MAX} characters.`
    : null;
}

/** What the photo screen says about the file. */
export type UploadState = 'uploaded' | 'waiting' | 'waitingWifi' | 'failed' | 'notOnPhone';

export function uploadStateText(state: UploadState): string {
  switch (state) {
    case 'uploaded':
      return 'Saved to your account';
    case 'waitingWifi':
      return 'On this phone. Uploads when you are on Wi-Fi';
    case 'waiting':
      return 'On this phone. Uploads when you are online';
    case 'failed':
      return 'Upload did not work yet. Trying again later';
    case 'notOnPhone':
      return 'Uploading from the phone that added it';
  }
}
