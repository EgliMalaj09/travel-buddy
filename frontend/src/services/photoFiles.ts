import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { apiBaseUrl, currentAccessToken } from '@/api/client';
import {
  fitSize,
  PHOTO_MAX_SIDE,
  PHOTO_QUALITY,
  THUMB_MAX_SIDE,
  THUMB_QUALITY,
} from '@/lib/photos';

/**
 * Photo files on the phone (KAN-39). Each photo lives in its own folder named by the photo's id:
 *   documents/photos/<id>/full.jpg and thumb.jpg  (photos added on this phone, and thumbnails
 *                                                  downloaded for photos from another phone)
 *   cache/photos/<id>/full.jpg                     (full photos downloaded from the server; the
 *                                                  phone may clear this folder when space is low)
 * The files are re-saved by the app (smaller, as JPEG), which also drops the photo's hidden data
 * (EXIF: GPS position, camera). Nothing about the photo is logged.
 */

export type PhotoPart = 'full' | 'thumb';

/** Photo files work only in the phone app (not in the web preview). */
export const photoFilesSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const folder = (root: Directory, id: string) => new Directory(root, 'photos', id);
const kept = (id: string, part: PhotoPart) => new File(folder(Paths.document, id), `${part}.jpg`);
const cached = (id: string) => new File(folder(Paths.cache, id), 'full.jpg');

/** The saved file for this part, or null when it is not on this phone. */
export function localPhoto(id: string, part: PhotoPart): File | null {
  if (!photoFilesSupported) return null;
  const file = kept(id, part);
  if (file.exists) return file;
  if (part === 'full') {
    const c = cached(id);
    if (c.exists) return c;
  }
  return null;
}

export interface PreparedPhoto {
  width: number;
  height: number;
  /** SHA-256 of the original file, lowercase hex. */
  contentHash: string;
}

/** SHA-256 of a picked file (before it is re-saved), so the same photo is not added twice. */
export async function hashOf(uri: string): Promise<string> {
  return (await new File(uri).digest('SHA-256')).toLowerCase();
}

async function saveResized(
  uri: string,
  width: number,
  height: number,
  max: number,
  quality: number,
  to: File,
) {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > max) context.resize(fitSize(width, height, max));
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality });
  const out = new File(result.uri);
  if (to.exists) to.delete();
  out.moveSync(to);
  return { width: result.width, height: result.height };
}

/**
 * Saves a picked photo under its id: the kept photo (longest side 2048, JPEG) and a thumbnail
 * (400). Returns the size of the kept photo. On failure nothing is left behind.
 */
export async function savePickedPhoto(
  id: string,
  picked: { uri: string; width: number; height: number },
): Promise<{ width: number; height: number }> {
  const dir = folder(Paths.document, id);
  try {
    if (!dir.exists) dir.create({ intermediates: true });
    const full = await saveResized(
      picked.uri,
      picked.width,
      picked.height,
      PHOTO_MAX_SIDE,
      PHOTO_QUALITY,
      kept(id, 'full'),
    );
    await saveResized(
      kept(id, 'full').uri,
      full.width,
      full.height,
      THUMB_MAX_SIDE,
      THUMB_QUALITY,
      kept(id, 'thumb'),
    );
    return full;
  } catch (error) {
    deletePhotoFiles(id);
    throw error;
  }
}

/** Photos being added right now: their files exist before their record does. */
const adding = new Set<string>();
export const markAdding = (id: string, on: boolean) => (on ? adding.add(id) : adding.delete(id));

/**
 * Removes the files of photos that have no record on this phone any more (deleted on another
 * phone, their trip deleted, or another user logged in). `knownIds` = every photo record here.
 */
export function removeOrphanPhotoFiles(knownIds: string[]): number {
  const known = new Set(knownIds);
  let removed = 0;
  for (const id of photoFolderIds()) {
    if (known.has(id) || adding.has(id)) continue;
    deletePhotoFiles(id);
    removed += 1;
  }
  return removed;
}

/**
 * Removes the copy the picker made in the app's cache. It still holds the photo's hidden data
 * (EXIF, GPS), so it is not left lying around. The original in the gallery is never touched.
 */
export function deletePickerCopy(uri: string): void {
  if (!photoFilesSupported || !uri.startsWith(Paths.cache.uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}

/** Removes every file of a photo from this phone. */
export function deletePhotoFiles(id: string): void {
  if (!photoFilesSupported) return;
  for (const root of [Paths.document, Paths.cache]) {
    try {
      const dir = folder(root, id);
      if (dir.exists) dir.delete();
    } catch {
      // Gone already.
    }
  }
}

/** The ids of every photo folder on this phone. */
export function photoFolderIds(): string[] {
  if (!photoFilesSupported) return [];
  const ids = new Set<string>();
  for (const root of [Paths.document, Paths.cache]) {
    const dir = new Directory(root, 'photos');
    if (!dir.exists) continue;
    for (const entry of dir.list()) if (entry instanceof Directory) ids.add(entry.name);
  }
  return [...ids];
}

/** Address of a photo part on the server. */
export const photoUrl = (id: string, part: PhotoPart) =>
  `${apiBaseUrl}/media/${encodeURIComponent(id)}/${part === 'full' ? 'file' : 'thumbnail'}`;

/** Downloads in progress, so a grid with many tiles asks once per photo. */
const downloading = new Map<string, Promise<File | null>>();

/**
 * The photo part from the server, saved on the phone (thumbnails kept, full photos in the cache).
 * Null when offline, not uploaded yet, or not allowed.
 */
export function downloadPhoto(id: string, part: PhotoPart): Promise<File | null> {
  if (!photoFilesSupported) return Promise.resolve(null);
  const key = `${id}/${part}`;
  const running = downloading.get(key);
  if (running) return running;
  const work = (async () => {
    const token = await currentAccessToken();
    if (!token) return null;
    const to = part === 'thumb' ? kept(id, 'thumb') : cached(id);
    const dir = to.parentDirectory;
    try {
      if (!dir.exists) dir.create({ intermediates: true });
      return await File.downloadFileAsync(photoUrl(id, part), to, {
        headers: { Authorization: `Bearer ${token}` },
        idempotent: true,
      });
    } catch {
      // Offline, or the server has no file yet: the grey placeholder stays (D4).
      return null;
    }
  })().finally(() => downloading.delete(key));
  downloading.set(key, work);
  return work;
}
