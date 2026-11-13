import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { rowToPlace } from '../../local/rows';
import { expenseTables, serverColumns, tripTables } from '../../local/tables';
import { toSyncChange } from '../../local/uploadChanges';
import type { SyncChange, SyncResult } from '../apiTripRepository';
import { createApiPlaceRepository, type PlaceApi } from '../apiPlaceRepository';
import { createLocalPlaceRepository } from '../localPlaceRepository';
import { createLocalTripRepository, type LocalDb } from '../localTripRepository';
import {
  createMockPlaceRepository,
  placeInputProblem,
  type PlaceInput,
  type PlaceRepository,
} from '../placeRepository';

function sqliteDb(): { db: LocalDb; sql: DatabaseSync } {
  const sql = new DatabaseSync(':memory:');
  for (const [name, columns] of Object.entries({ ...tripTables, ...expenseTables })) {
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

const colosseum: PlaceInput = {
  title: ' Colosseum ',
  note: '  Book online ',
  category: 'sight',
  plannedDate: '2027-04-13',
  countryCode: 'IT',
  cityName: 'Rome',
  lat: 41.9,
  lng: 12.5,
  address: null,
  geoProviderId: null,
};

describe('place input checks (same as the server)', () => {
  it('needs a name, a country and a full position', () => {
    expect(placeInputProblem(colosseum)).toBeNull();
    expect(placeInputProblem({ ...colosseum, title: '  ' })).toBe('The place needs a name.');
    expect(placeInputProblem({ ...colosseum, title: 'a'.repeat(121) })).toMatch(/120/);
    expect(placeInputProblem({ ...colosseum, countryCode: '' })).toBe('The place needs a country.');
    expect(placeInputProblem({ ...colosseum, lng: null })).toMatch(/position/);
    expect(placeInputProblem({ ...colosseum, lat: null, lng: null })).toBeNull();
    expect(placeInputProblem({ ...colosseum, lat: 91 })).toMatch(/out of range/);
    expect(placeInputProblem({ ...colosseum, address: 'a'.repeat(301) })).toMatch(/300/);
  });
});

/** The same behaviour for every implementation. */
function behaves(name: string, make: () => PlaceRepository) {
  describe(`${name} place repository`, () => {
    it('adds, lists by day, edits, marks visited and back, and deletes', async () => {
      const repo = make();
      const a = await repo.createPlace('trip-1', colosseum, 'user-1');
      expect(a).toMatchObject({
        tripId: 'trip-1',
        title: 'Colosseum',
        note: 'Book online',
        status: 'planned',
        scope: 'shared',
        plannedDate: '2027-04-13',
        isSuggested: false,
      });
      await repo.createPlace(
        'trip-1',
        { ...colosseum, title: 'Gelato', plannedDate: null },
        'user-1',
      );
      await repo.createPlace(
        'trip-1',
        { ...colosseum, title: 'Vatican', plannedDate: '2027-04-12' },
        'user-1',
      );
      await repo.createPlace('trip-2', { ...colosseum, title: 'Other trip' }, 'user-1');
      expect((await repo.listPlaces('trip-1')).map((p) => p.title)).toEqual([
        'Vatican',
        'Colosseum',
        'Gelato',
      ]);

      await repo.updatePlace(a.id, { ...colosseum, title: 'Colosseo', note: null });
      await repo.setVisited(a.id, true);
      let saved = (await repo.listPlaces('trip-1')).find((p) => p.id === a.id)!;
      expect(saved).toMatchObject({ title: 'Colosseo', note: null, status: 'visited' });
      expect(saved.visitedAt).toBeTruthy();

      await repo.setVisited(a.id, false);
      saved = (await repo.listPlaces('trip-1')).find((p) => p.id === a.id)!;
      expect(saved).toMatchObject({ status: 'planned', visitedAt: null });

      await repo.deletePlace(a.id);
      expect((await repo.listPlaces('trip-1')).map((p) => p.title)).toEqual(['Vatican', 'Gelato']);
    });

    it('keeps the exact spot from the map, and drops it again (KAN-37)', async () => {
      const repo = make();
      const exact = {
        ...colosseum,
        lat: 41.89021,
        lng: 12.492231,
        address: ' Piazza del Colosseo 1, Rome ',
        geoProviderId: 'osm:W:27000000',
      };
      const a = await repo.createPlace('trip-1', exact, 'user-1');
      let saved = (await repo.listPlaces('trip-1')).find((p) => p.id === a.id)!;
      expect(saved).toMatchObject({
        lat: 41.89021,
        lng: 12.492231,
        address: 'Piazza del Colosseo 1, Rome',
        geoProviderId: 'osm:W:27000000',
      });

      await repo.updatePlace(a.id, colosseum);
      saved = (await repo.listPlaces('trip-1')).find((p) => p.id === a.id)!;
      expect(saved).toMatchObject({ lat: 41.9, address: null, geoProviderId: null });
    });

    it('refuses a place without a name', async () => {
      await expect(make().createPlace('trip-1', { ...colosseum, title: '' }, 'u')).rejects.toThrow(
        'The place needs a name.',
      );
    });
  });
}

behaves('mock', () => createMockPlaceRepository());
behaves('local', () => createLocalPlaceRepository(sqliteDb().db));

/** A tiny server for the API repository: applies changes column by column. */
function fakePlaceApi(): PlaceApi & { sent: SyncChange[] } {
  const rows = new Map<string, Record<string, unknown>>();
  const sent: SyncChange[] = [];
  return {
    sent,
    async list(tripId) {
      return [...rows.entries()]
        .filter(([, r]) => r.trip_id === tripId && !r.deleted_at)
        .map(([id, r]) => {
          const place = rowToPlace({ id, ...r, version: 1 });
          return { ...place, createdAt: String(r.created_at) };
        });
    },
    async upload(changes): Promise<SyncResult[]> {
      for (const c of changes) {
        sent.push(c);
        if (c.op === 'DELETE') rows.set(c.id, { ...rows.get(c.id), deleted_at: 'now' });
        else
          rows.set(c.id, {
            created_at: new Date(Date.now() + rows.size).toISOString(),
            ...rows.get(c.id),
            ...c.data,
          });
      }
      return changes.map((c) => ({ id: c.id, type: c.type, status: 'ok', problems: null }));
    },
  };
}

behaves('api', () => createApiPlaceRepository(fakePlaceApi()));

describe('places in the offline queue', () => {
  it('sends a new place without the server-only columns', async () => {
    const { db, sql } = sqliteDb();
    const place = await createLocalPlaceRepository(db).createPlace('trip-1', colosseum, 'user-1');
    const row = sql.prepare('SELECT * FROM places WHERE id = ?').get(place.id) as Record<
      string,
      unknown
    >;
    const change = toSyncChange({ op: 'PUT', table: 'places', id: place.id, opData: row })!;
    expect(change.type).toBe('places');
    for (const column of serverColumns) expect(change.data).not.toHaveProperty(column);
    expect(change.data).toMatchObject({ title: 'Colosseum', status: 'planned', is_suggested: 0 });
  });

  it('deleting a trip on the phone removes its places too', async () => {
    const { db } = sqliteDb();
    const trips = createLocalTripRepository(db);
    const places = createLocalPlaceRepository(db);
    const trip = await trips.createTrip(
      {
        name: 'Rome',
        startDate: null,
        endDate: null,
        activities: [],
        stops: [
          {
            cityName: 'Rome',
            countryCode: 'IT',
            lat: null,
            lng: null,
            geoProviderId: null,
            nights: 2,
          },
        ],
        flights: [],
      },
      { ownerId: 'user-1', passportCountry: 'AL', homeCurrency: 'EUR' },
    );
    await places.createPlace(trip.id, colosseum, 'user-1');
    await trips.deleteTrip(trip.id);
    expect(await places.listPlaces(trip.id)).toEqual([]);
  });
});
