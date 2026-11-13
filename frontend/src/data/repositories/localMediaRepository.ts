import { cleanNote, sortPhotos } from '@/lib/photos';

import { notifyDataChanged } from '../changes';
import { rowToMedia } from '../local/rows';
import { insert, update, type LocalDb } from './localTripRepository';
import {
  checkNote,
  checkPhoto,
  DUPLICATE_PHOTO,
  newPhotoColumns,
  type MediaRepository,
} from './mediaRepository';

/**
 * Photo records saved on the phone first (KAN-39): works with no signal. PowerSync sends the
 * record to the server (POST /sync/upload); the file goes up separately (services/photoUpload).
 */
export function createLocalMediaRepository(
  db: LocalDb,
  now: () => string = () => new Date().toISOString(),
): MediaRepository {
  async function find(id: string) {
    const rows = await db.getAll('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] ? rowToMedia(rows[0]) : null;
  }

  return {
    async listPhotos(tripId) {
      const rows = await db.getAll(
        "SELECT * FROM media WHERE trip_id = ? AND deleted_at IS NULL AND purpose = 'trip_photo'",
        [tripId],
      );
      return sortPhotos(rows.map(rowToMedia));
    },
    getPhoto: find,
    async listWaitingUploads(userId) {
      const rows = await db.getAll(
        'SELECT * FROM media WHERE owner_user_id = ? AND uploaded_at IS NULL AND deleted_at IS NULL',
        [userId],
      );
      return rows.map(rowToMedia);
    },
    async listAllIds() {
      const rows = await db.getAll<{ id: string }>('SELECT id FROM media');
      return rows.map((r) => String(r.id));
    },
    async addPhoto(tripId, input, userId) {
      checkPhoto(input);
      const at = now();
      await db.writeTransaction(async (tx) => {
        const same = await tx.getAll(
          'SELECT id FROM media WHERE trip_id = ? AND content_hash = ? AND deleted_at IS NULL',
          [tripId, input.contentHash],
        );
        if (same.length) throw new Error(DUPLICATE_PHOTO);
        await insert(tx, 'media', {
          id: input.id,
          ...newPhotoColumns(tripId, input),
          // Server-only, kept on the phone for reading until the server's row comes back.
          owner_user_id: userId,
          file_key: null,
          thumbnail_key: null,
          size_bytes: null,
          uploaded_at: null,
          created_at: at,
          updated_at: at,
          deleted_at: null,
          version: 0,
        });
      });
      notifyDataChanged();
      const photo = await find(input.id);
      if (!photo) throw new Error('The photo was not saved. Please try again.');
      return photo;
    },
    async updateNote(id, note) {
      checkNote(note);
      if (!(await find(id))) throw new Error('Photo not found.');
      await db.writeTransaction((tx) =>
        update(tx, 'media', id, { caption: cleanNote(note), updated_at: now() }),
      );
      notifyDataChanged();
      return (await find(id))!;
    },
    async deletePhoto(id) {
      await db.writeTransaction((tx) => tx.execute('DELETE FROM media WHERE id = ?', [id]));
      notifyDataChanged();
    },
  };
}
