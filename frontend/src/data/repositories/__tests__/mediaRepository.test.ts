import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { mediaTables, serverColumns } from '../../local/tables';
import { toSyncChange } from '../../local/uploadChanges';
import { createLocalMediaRepository } from '../localMediaRepository';
import type { LocalDb } from '../localTripRepository';
import {
  createMockMediaRepository,
  DUPLICATE_PHOTO,
  photoInputProblem,
  type MediaRepository,
  type PhotoInput,
} from '../mediaRepository';

function sqliteDb(): { db: LocalDb; sql: DatabaseSync } {
  const sql = new DatabaseSync(':memory:');
  for (const [name, columns] of Object.entries(mediaTables)) {
    const cols = Object.entries(columns).map(([c, type]) => `"${c}" ${type}`);
    sql.exec(`CREATE TABLE ${name} (id TEXT PRIMARY KEY, ${cols.join(', ')})`);
  }
  const run = (q: string, p: unknown[] = []) => sql.prepare(q).run(...(p as SQLInputValue[]));
  const all = async <T>(q: string, p: unknown[] = []) =>
    sql.prepare(q).all(...(p as SQLInputValue[])) as T[];
  const db: LocalDb = {
    getAll: all,
    async writeTransaction(work) {
      sql.exec('BEGIN');
      try {
        const result = await work({ execute: async (q, p) => run(q, p), getAll: all });
        sql.exec('COMMIT');
        return result;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { db, sql };
}

const hash = (c: string) => c.repeat(64);
const sunset = (id: string, h = hash('a')): PhotoInput => ({
  id,
  source: 'camera',
  width: 2048,
  height: 1536,
  takenAt: '2027-04-13T18:30:00.000Z',
  contentHash: h,
  caption: '  Sunset  ',
});

describe('photo input checks (same as the server)', () => {
  it('needs a size, a SHA-256 and a short note', () => {
    expect(photoInputProblem(sunset('1'))).toBeNull();
    expect(photoInputProblem({ ...sunset('1'), width: 0 })).toMatch(/size/);
    expect(photoInputProblem({ ...sunset('1'), contentHash: 'ABC' })).toMatch(/read/);
    expect(photoInputProblem({ ...sunset('1'), caption: 'a'.repeat(2001) })).toMatch(/2000/);
  });
});

function behaves(name: string, make: () => MediaRepository) {
  describe(`${name} photo repository`, () => {
    it('adds, lists newest first, edits the note, refuses the same photo twice and deletes', async () => {
      const repo = make();
      const first = await repo.addPhoto('trip-1', sunset('p1'), 'user-1');
      expect(first).toMatchObject({
        id: 'p1',
        caption: 'Sunset',
        ownerUserId: 'user-1',
        uploadedAt: null,
        includeInVideo: true,
      });
      await repo.addPhoto(
        'trip-1',
        { ...sunset('p2', hash('b')), takenAt: '2027-04-14T09:00:00.000Z' },
        'user-1',
      );
      await expect(repo.addPhoto('trip-1', sunset('p3'), 'user-1')).rejects.toThrow(
        DUPLICATE_PHOTO,
      );
      // The same photo in another trip is fine.
      await repo.addPhoto('trip-2', sunset('p4'), 'user-1');

      expect((await repo.listPhotos('trip-1')).map((p) => p.id)).toEqual(['p2', 'p1']);
      expect((await repo.updateNote('p1', '  Edited ')).caption).toBe('Edited');
      expect((await repo.updateNote('p1', '  ')).caption).toBeNull();

      await repo.deletePhoto('p1');
      expect(await repo.getPhoto('p1')).toBeNull();
      expect((await repo.listPhotos('trip-1')).map((p) => p.id)).toEqual(['p2']);
    });
  });
}

behaves('mock', () => createMockMediaRepository());
behaves('local', () => createLocalMediaRepository(sqliteDb().db));

describe('local photo repository', () => {
  it('lists the photos still to upload, and never sends server-only columns', async () => {
    const { db, sql } = sqliteDb();
    const repo = createLocalMediaRepository(db);
    await repo.addPhoto('trip-1', sunset('p1'), 'user-1');
    await repo.addPhoto('trip-1', sunset('p2', hash('b')), 'user-1');
    sql.exec("UPDATE media SET uploaded_at = '2027-04-13T20:00:00Z' WHERE id = 'p2'");
    expect((await repo.listWaitingUploads('user-1')).map((p) => p.id)).toEqual(['p1']);
    expect(await repo.listWaitingUploads('user-2')).toEqual([]);
    expect((await repo.listAllIds()).sort()).toEqual(['p1', 'p2']);

    const change = toSyncChange({
      op: 'PUT',
      table: 'media',
      id: 'p1',
      opData: { owner_user_id: 'user-1', uploaded_at: null, file_key: null, caption: 'x' },
    });
    expect(Object.keys(change?.data ?? {}).filter((c) => serverColumns.has(c))).toEqual([]);
  });
});
