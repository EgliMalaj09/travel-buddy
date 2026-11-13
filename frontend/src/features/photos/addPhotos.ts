import * as ImagePicker from 'expo-image-picker';

import { DUPLICATE_PHOTO, repositories } from '@/data';
import { newId } from '@/lib/ids';
import { exifTakenAt, PICK_LIMIT } from '@/lib/photos';
import {
  deletePhotoFiles,
  deletePickerCopy,
  hashOf,
  markAdding,
  photoFilesSupported,
  savePickedPhoto,
} from '@/services/photoFiles';

import { startPhotoUploads } from './usePhotoSync';

export type PhotoSource = 'camera' | 'library';

export interface AddResult {
  added: number;
  duplicates: number;
  failed: number;
  /** Set when nothing could start (no permission, web). */
  problem?: string;
}

/** A short line for the result of adding photos, or null when there is nothing to say. */
export function addResultText(r: AddResult): string | null {
  if (r.problem) return r.problem;
  const parts: string[] = [];
  if (r.duplicates)
    parts.push(
      r.duplicates === 1
        ? '1 photo was already in this trip.'
        : `${r.duplicates} photos were already in this trip.`,
    );
  if (r.failed)
    parts.push(
      r.failed === 1 ? '1 photo could not be added.' : `${r.failed} photos could not be added.`,
    );
  return parts.length ? parts.join(' ') : null;
}

async function allowed(source: PhotoSource): Promise<boolean> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

/**
 * Takes a photo or picks up to 20 from the library, saves them on the phone (smaller, as JPEG,
 * without hidden data) and adds them to the trip. Works with no signal: the files upload later.
 */
export async function addPhotos(
  tripId: string,
  source: PhotoSource,
  userId: string,
): Promise<AddResult> {
  const result: AddResult = { added: 0, duplicates: 0, failed: 0 };
  if (!photoFilesSupported) return { ...result, problem: 'Adding photos works in the phone app.' };
  if (!(await allowed(source))) {
    return {
      ...result,
      problem:
        source === 'camera'
          ? 'Allow the camera in your phone settings to take photos here.'
          : 'Allow access to your photos in your phone settings to add them here.',
    };
  }

  // exif: only the time the photo was taken is read from it (never the position).
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    exif: true,
    quality: 1,
  };
  const picked =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync({
          ...options,
          allowsMultipleSelection: true,
          selectionLimit: PICK_LIMIT,
          orderedSelection: true,
        });
  if (picked.canceled) return result;

  const known = new Set((await repositories.media.listPhotos(tripId)).map((m) => m.contentHash));
  for (const asset of picked.assets.slice(0, PICK_LIMIT)) {
    const id = newId();
    markAdding(id, true);
    try {
      const contentHash = await hashOf(asset.uri);
      if (known.has(contentHash)) {
        result.duplicates += 1;
        continue;
      }
      const size = await savePickedPhoto(id, asset);
      await repositories.media.addPhoto(
        tripId,
        {
          id,
          source,
          width: size.width,
          height: size.height,
          takenAt:
            exifTakenAt(asset.exif) ?? (source === 'camera' ? new Date().toISOString() : null),
          contentHash,
          caption: null,
        },
        userId,
      );
      known.add(contentHash);
      result.added += 1;
    } catch (error) {
      deletePhotoFiles(id);
      if (error instanceof Error && error.message === DUPLICATE_PHOTO) result.duplicates += 1;
      else result.failed += 1;
    } finally {
      markAdding(id, false);
      deletePickerCopy(asset.uri);
    }
  }
  if (result.added) startPhotoUploads();
  return result;
}
