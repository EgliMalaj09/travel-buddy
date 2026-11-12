import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { tripTables } from '../../local/tables';
import { createLocalTripRepository, type LocalDb } from '../localTripRepository';
import type { TripInput } from '../tripRepository';

/** The phone's tables in a plain SQLite database (PowerSync uses the same table and column names). */
function sqliteDb(): { db: LocalDb; sql: DatabaseSync } {
  const sql = new DatabaseSync(':memory:');
  for (const [name, columns] of Object.entries(tripTables)) {
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

const owner = { ownerId: 'user-1', passportCountry: 'AL', homeCurrency: 'ALL' };

const input: TripInput = {
  name: ' Rome & Florence ',
  startDate: '2027-04-12',
  endDate: '2027-04-19',
  activities: ['city', 'food'],
  stops: [
    { cityName: 'Rome', countryCode: 'IT', lat: 41.9, lng: 12.5, geoProviderId: null, nights: 4 },
    {
      cityName: 'Florence',
      countryCode: 'IT',
      lat: null,
      lng: null,
      geoProviderId: null,
      nights: 3,
    },
  ],
  flights: [
    {
      direction: 'outbound',
      airline: 'Wizz Air',
      flightNumber: 'W6 4567',
      departureAirport: 'TIA',
      arrivalAirport: 'FCO',
      departureLocalTime: '2027-04-12T09:40',
      arrivalLocalTime: null,
      departureTimeZone: 'Europe/Tirane',
      arrivalTimeZone: null,
      bookingCode: null,
      seat: null,
      terminal: null,
    },
  ],
};

describe('local trip repository (offline, KAN-15)', () => {
  it('saves a trip with its stops and flights on the phone and reads it back', async () => {
    const { db } = sqliteDb();
    const repo = createLocalTripRepository(db, () => '2026-11-12T10:00:00.000Z');
    const trip = await repo.createTrip(input, owner);

    expect(trip).toMatchObject({
      name: 'Rome & Florence',
      ownerId: 'user-1',
      type: 'solo',
      status: 'planned',
      activities: ['city', 'food'],
      startDate: '2027-04-12',
      passportCountrySnapshot: 'AL',
      homeCurrencySnapshot: 'ALL',
      anniversaryEnabled: true,
      deletedAt: null,
      createdAt: '2026-11-12T10:00:00.000Z',
    });
    expect(await repo.listTrips()).toHaveLength(1);
    const stops = await repo.listStops(trip.id);
    expect(stops.map((s) => [s.cityName, s.order, s.nights, s.lat])).toEqual([
      ['Rome', 0, 4, 41.9],
      ['Florence', 1, 3, null],
    ]);
    const flights = await repo.listFlights(trip.id);
    expect(flights[0]).toMatchObject({
      airline: 'Wizz Air',
      departureLocalTime: '2027-04-12T09:40',
    });
  });

  it('refuses a trip that breaks the rules before writing anything', async () => {
    const { db } = sqliteDb();
    const repo = createLocalTripRepository(db);
    await expect(repo.createTrip({ ...input, stops: [] }, owner)).rejects.toThrow(
      'Add at least one stop.',
    );
    expect(await repo.listTrips()).toEqual([]);
  });

  it('edits a trip: keeps, adds and removes stops, writing new stops before removing old ones', async () => {
    const { db, sql } = sqliteDb();
    const repo = createLocalTripRepository(db);
    const trip = await repo.createTrip(input, owner);
    const [rome] = await repo.listStops(trip.id);

    const log: string[] = [];
    const logged: LocalDb = {
      getAll: db.getAll,
      writeTransaction: (work) =>
        db.writeTransaction((tx) =>
          work({
            getAll: tx.getAll,
            execute: (q, p) => {
              log.push(q.split(' ').slice(0, 3).join(' '));
              return tx.execute(q, p);
            },
          }),
        ),
    };
    const updated = await createLocalTripRepository(logged).updateTrip(trip.id, {
      ...input,
      name: 'Italy',
      stops: [
        { ...rome!, nights: 5 },
        {
          cityName: 'Naples',
          countryCode: 'IT',
          lat: null,
          lng: null,
          geoProviderId: null,
          nights: 2,
        },
      ],
      flights: [],
    });

    expect(updated.name).toBe('Italy');
    const stops = await repo.listStops(trip.id);
    expect(stops.map((s) => [s.cityName, s.nights])).toEqual([
      ['Rome', 5],
      ['Naples', 2],
    ]);
    expect(stops[0]!.id).toBe(rome!.id);
    expect(await repo.listFlights(trip.id)).toEqual([]);
    expect(log.indexOf('DELETE FROM trip_stops')).toBeGreaterThan(
      log.indexOf('INSERT INTO trip_stops'),
    );
    expect(sql.prepare('SELECT count(*) AS n FROM trip_stops').get()).toEqual({ n: 2 });
  });

  it('deletes a trip with its stops and flights, the trip first', async () => {
    const { db } = sqliteDb();
    const repo = createLocalTripRepository(db);
    const trip = await repo.createTrip(input, owner);
    await repo.deleteTrip(trip.id);
    expect(await repo.listTrips()).toEqual([]);
    expect(await repo.getTrip(trip.id)).toBeNull();
    expect(await repo.listStops(trip.id)).toEqual([]);
    expect(await repo.listFlights(trip.id)).toEqual([]);
  });

  it('reads rows downloaded from the server (PostgreSQL text forms)', async () => {
    const { db, sql } = sqliteDb();
    sql
      .prepare(
        `INSERT INTO trips (id, owner_id, name, type, start_date, end_date, activities, status,
          passport_country_snapshot, home_currency_snapshot, anniversary_enabled, created_at, updated_at, version)
         VALUES ('t1', 'user-1', 'Paris', 'solo', '2027-05-01', '2027-05-04', '["city"]', 'planned',
          'AL', 'ALL', 0, '2026-11-12 10:00:00.123456Z', '2026-11-12 11:00:00Z', 3)`,
      )
      .run();
    sql
      .prepare(
        `INSERT INTO flights (id, trip_id, "order", direction, departure_local_time, version)
         VALUES ('f1', 't1', 0, 'outbound', '2027-05-01 07:15:00', 1)`,
      )
      .run();
    const repo = createLocalTripRepository(db);
    const [trip] = await repo.listTrips();
    expect(trip).toMatchObject({
      id: 't1',
      activities: ['city'],
      anniversaryEnabled: false,
      createdAt: '2026-11-12T10:00:00.123456Z',
      version: 3,
    });
    const [flight] = await repo.listFlights('t1');
    expect(flight!.departureLocalTime).toBe('2027-05-01T07:15');
  });
});
