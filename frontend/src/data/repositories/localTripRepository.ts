import { newId } from '@/lib/ids';

import { notifyDataChanged } from '../changes';
import { rowToFlight, rowToStop, rowToTrip, type Row } from '../local/rows';
import type { Trip } from '../types';
import { tripInputProblem, type TripInput, type TripRepository } from './tripRepository';

/**
 * The few database calls this repository needs. PowerSync's database has exactly these
 * (getAll, writeTransaction); tests use a plain SQLite database.
 */
export interface LocalDb {
  getAll<T = Row>(sql: string, parameters?: unknown[]): Promise<T[]>;
  writeTransaction<T>(
    run: (tx: {
      execute(sql: string, parameters?: unknown[]): Promise<unknown>;
      getAll<R = Row>(sql: string, parameters?: unknown[]): Promise<R[]>;
    }) => Promise<T>,
  ): Promise<T>;
}

export type Tx = Parameters<Parameters<LocalDb['writeTransaction']>[0]>[0];

export const insert = (tx: Tx, table: string, values: Row) => {
  const columns = Object.keys(values);
  return tx.execute(
    `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    Object.values(values),
  );
};

export const update = (tx: Tx, table: string, id: string, values: Row) => {
  const columns = Object.keys(values);
  return tx.execute(
    `UPDATE ${table} SET ${columns.map((c) => `"${c}" = ?`).join(', ')} WHERE id = ?`,
    [...Object.values(values), id],
  );
};

/**
 * Trips saved on the phone first (KAN-15, offline sync). Every read and write uses the local
 * database, so it works with no signal. PowerSync sends the writes to the server
 * (POST /sync/upload, see local/uploadChanges.ts) and brings back changes from other phones.
 *
 * Deletes remove the row on the phone; PowerSync sends them as DELETE and the server keeps a
 * soft delete (deleted_at). Order matters for the server's rules: new and changed stops are
 * written before old ones are removed (a trip keeps 1+ stop), and a trip is removed before its stops.
 */
export function createLocalTripRepository(
  db: LocalDb,
  now: () => string = () => new Date().toISOString(),
): TripRepository {
  function check(input: TripInput) {
    const problem = tripInputProblem(input);
    if (problem) throw new Error(problem);
  }

  const fresh = () => {
    const at = now();
    return { created_at: at, updated_at: at, deleted_at: null, version: 0 };
  };

  async function findTrip(id: string): Promise<Trip | null> {
    const rows = await db.getAll('SELECT * FROM trips WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] ? rowToTrip(rows[0]) : null;
  }

  /** Stops and flights of a trip: change the kept ones, add new ones, then remove the rest. */
  async function writeChildren(tx: Tx, tripId: string, input: TripInput) {
    const oldStops = await tx.getAll<{ id: string }>(
      'SELECT id FROM trip_stops WHERE trip_id = ?',
      [tripId],
    );
    const oldFlights = await tx.getAll<{ id: string }>('SELECT id FROM flights WHERE trip_id = ?', [
      tripId,
    ]);
    const has = (rows: { id: string }[], id?: string) => !!id && rows.some((r) => r.id === id);

    for (const [order, s] of input.stops.entries()) {
      const values = {
        trip_id: tripId,
        order,
        country_code: s.countryCode,
        city_name: s.cityName.trim(),
        lat: s.lat,
        lng: s.lng,
        geo_provider_id: s.geoProviderId,
        nights: s.nights,
      };
      if (has(oldStops, s.id))
        await update(tx, 'trip_stops', s.id!, { ...values, updated_at: now() });
      else await insert(tx, 'trip_stops', { id: newId(), ...values, ...fresh() });
    }
    for (const [order, { id, ...f }] of input.flights.entries()) {
      const values = {
        trip_id: tripId,
        order,
        direction: f.direction,
        airline: f.airline,
        flight_number: f.flightNumber,
        departure_airport: f.departureAirport,
        arrival_airport: f.arrivalAirport,
        departure_local_time: f.departureLocalTime,
        arrival_local_time: f.arrivalLocalTime,
        departure_time_zone: f.departureTimeZone,
        arrival_time_zone: f.arrivalTimeZone,
        booking_code: f.bookingCode,
        seat: f.seat,
        terminal: f.terminal,
      };
      if (has(oldFlights, id)) await update(tx, 'flights', id!, { ...values, updated_at: now() });
      else await insert(tx, 'flights', { id: newId(), ...values, ...fresh() });
    }

    const keepStops = new Set(input.stops.map((s) => s.id));
    const keepFlights = new Set(input.flights.map((f) => f.id));
    for (const s of oldStops)
      if (!keepStops.has(s.id)) await tx.execute('DELETE FROM trip_stops WHERE id = ?', [s.id]);
    for (const f of oldFlights)
      if (!keepFlights.has(f.id)) await tx.execute('DELETE FROM flights WHERE id = ?', [f.id]);
  }

  return {
    async listTrips() {
      const rows = await db.getAll('SELECT * FROM trips WHERE deleted_at IS NULL');
      return rows.map(rowToTrip);
    },
    getTrip: findTrip,
    async listStops(tripId) {
      const rows = await db.getAll(
        'SELECT * FROM trip_stops WHERE trip_id = ? AND deleted_at IS NULL ORDER BY "order"',
        [tripId],
      );
      return rows.map(rowToStop);
    },
    async listFlights(tripId) {
      const rows = await db.getAll(
        'SELECT * FROM flights WHERE trip_id = ? AND deleted_at IS NULL ORDER BY "order"',
        [tripId],
      );
      return rows.map(rowToFlight);
    },
    async createTrip(input, owner) {
      check(input);
      const id = newId();
      await db.writeTransaction(async (tx) => {
        await insert(tx, 'trips', {
          id,
          owner_id: owner.ownerId,
          name: input.name.trim(),
          type: 'solo',
          start_date: input.startDate,
          end_date: input.endDate,
          activities: JSON.stringify(input.activities),
          status: 'planned',
          finished_at: null,
          cover_media_id: null,
          passport_country_snapshot: owner.passportCountry,
          home_currency_snapshot: owner.homeCurrency,
          checklist_generated_at: null,
          checklist_rules_version: null,
          anniversary_enabled: 1,
          ...fresh(),
        });
        await writeChildren(tx, id, input);
      });
      notifyDataChanged();
      const trip = await findTrip(id);
      if (!trip) throw new Error('The trip was not saved. Please try again.');
      return trip;
    },
    async updateTrip(id, input) {
      check(input);
      if (!(await findTrip(id))) throw new Error('Trip not found.');
      await db.writeTransaction(async (tx) => {
        await update(tx, 'trips', id, {
          name: input.name.trim(),
          start_date: input.startDate,
          end_date: input.endDate,
          activities: JSON.stringify(input.activities),
          updated_at: now(),
        });
        await writeChildren(tx, id, input);
      });
      notifyDataChanged();
      const trip = await findTrip(id);
      if (!trip) throw new Error('Trip not found.');
      return trip;
    },
    async deleteTrip(id) {
      await db.writeTransaction(async (tx) => {
        // The trip first: the server then removes its stops, flights and places with it.
        await tx.execute('DELETE FROM trips WHERE id = ?', [id]);
        await tx.execute('DELETE FROM trip_stops WHERE trip_id = ?', [id]);
        await tx.execute('DELETE FROM flights WHERE trip_id = ?', [id]);
        await tx.execute('DELETE FROM places WHERE trip_id = ?', [id]);
      });
      notifyDataChanged();
    },
  };
}
