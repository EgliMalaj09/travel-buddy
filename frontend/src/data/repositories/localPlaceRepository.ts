import { newId } from '@/lib/ids';

import { notifyDataChanged } from '../changes';
import { rowToPlace } from '../local/rows';
import { insert, update, type LocalDb } from './localTripRepository';
import {
  checkPlace,
  newPlaceColumns,
  placeColumns,
  sortPlaces,
  type PlaceRepository,
} from './placeRepository';

/**
 * Places saved on the phone first (KAN-34): works with no signal. PowerSync sends the writes to
 * the server (POST /sync/upload) and brings back changes made on other phones.
 */
export function createLocalPlaceRepository(
  db: LocalDb,
  now: () => string = () => new Date().toISOString(),
): PlaceRepository {
  async function find(id: string) {
    const rows = await db.getAll('SELECT * FROM places WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] ? rowToPlace(rows[0]) : null;
  }

  return {
    async listPlaces(tripId) {
      const rows = await db.getAll(
        'SELECT * FROM places WHERE trip_id = ? AND deleted_at IS NULL',
        [tripId],
      );
      return sortPlaces(rows.map(rowToPlace));
    },
    getPlace: find,
    async createPlace(tripId, input, userId) {
      checkPlace(input);
      const id = newId();
      const at = now();
      await db.writeTransaction((tx) =>
        insert(tx, 'places', {
          id,
          ...newPlaceColumns(tripId),
          ...placeColumns(input),
          // Server-only, kept on the phone for reading until the server's row comes back.
          created_by_user_id: userId,
          owner_user_id: null,
          created_at: at,
          updated_at: at,
          deleted_at: null,
          version: 0,
        }),
      );
      notifyDataChanged();
      const place = await find(id);
      if (!place) throw new Error('The place was not saved. Please try again.');
      return place;
    },
    async updatePlace(id, input) {
      checkPlace(input);
      if (!(await find(id))) throw new Error('Place not found.');
      await db.writeTransaction((tx) =>
        update(tx, 'places', id, { ...placeColumns(input), updated_at: now() }),
      );
      notifyDataChanged();
      return (await find(id))!;
    },
    async setVisited(id, visited) {
      if (!(await find(id))) throw new Error('Place not found.');
      await db.writeTransaction((tx) =>
        update(tx, 'places', id, {
          status: visited ? 'visited' : 'planned',
          visited_at: visited ? now() : null,
          updated_at: now(),
        }),
      );
      notifyDataChanged();
    },
    async deletePlace(id) {
      await db.writeTransaction((tx) => tx.execute('DELETE FROM places WHERE id = ?', [id]));
      notifyDataChanged();
    },
  };
}
