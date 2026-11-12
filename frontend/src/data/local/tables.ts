/**
 * The trip tables on the phone (local SQLite via PowerSync, KAN-15).
 * Names and columns are the server's (snake_case), because PowerSync copies whole rows from
 * PostgreSQL (backend/docker/powersync/sync-rules.yaml). `id` is added by PowerSync itself.
 *
 * SQLite has only text, integer and real: dates and times are text, booleans are 0/1,
 * lists (activities) are JSON text.
 */
export type ColumnType = 'text' | 'integer' | 'real';

const sync = {
  created_at: 'text',
  updated_at: 'text',
  deleted_at: 'text',
  version: 'integer',
} as const satisfies Record<string, ColumnType>;

export const tripTables = {
  trips: {
    owner_id: 'text',
    name: 'text',
    type: 'text',
    start_date: 'text',
    end_date: 'text',
    activities: 'text',
    status: 'text',
    finished_at: 'text',
    cover_media_id: 'text',
    passport_country_snapshot: 'text',
    home_currency_snapshot: 'text',
    checklist_generated_at: 'text',
    checklist_rules_version: 'text',
    anniversary_enabled: 'integer',
    ...sync,
  },
  trip_stops: {
    trip_id: 'text',
    order: 'integer',
    country_code: 'text',
    city_name: 'text',
    lat: 'real',
    lng: 'real',
    geo_provider_id: 'text',
    nights: 'integer',
    ...sync,
  },
  flights: {
    trip_id: 'text',
    order: 'integer',
    direction: 'text',
    airline: 'text',
    flight_number: 'text',
    departure_airport: 'text',
    arrival_airport: 'text',
    departure_local_time: 'text',
    arrival_local_time: 'text',
    departure_time_zone: 'text',
    arrival_time_zone: 'text',
    booking_code: 'text',
    seat: 'text',
    terminal: 'text',
    ...sync,
  },
} as const satisfies Record<string, Record<string, ColumnType>>;

export type TripTableName = keyof typeof tripTables;
export const tripTableNames = Object.keys(tripTables) as TripTableName[];

/** Set by the server only. The phone keeps them for reading but never sends them. */
export const serverColumns = new Set([
  'id',
  'owner_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'version',
]);
