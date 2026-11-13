/**
 * The synced tables on the phone (trips, stops, flights, places, checklist, expenses, photos, settings) (local SQLite via PowerSync, KAN-15).
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
    rating: 'integer',
    finish_note: 'text',
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
  // Places (KAN-34/35). Booleans are 0/1, planned_date "2027-04-12", visited_at ISO text.
  places: {
    trip_id: 'text',
    created_by_user_id: 'text',
    owner_user_id: 'text',
    scope: 'text',
    status: 'text',
    title: 'text',
    note: 'text',
    lat: 'real',
    lng: 'real',
    country_code: 'text',
    city_name: 'text',
    address: 'text',
    geo_provider_id: 'text',
    category: 'text',
    planned_date: 'text',
    visited_at: 'text',
    source: 'text',
    is_suggested: 'integer',
    cover_media_id: 'text',
    copied_from_place_id: 'text',
    ...sync,
  },
} as const satisfies Record<string, Record<string, ColumnType>>;

/** Smart checklist (KAN-24). Booleans are 0/1. Deleted auto items stay as rows with deleted_at set. */
export const checklistTables = {
  checklist_items: {
    trip_id: 'text',
    type: 'text',
    title: 'text',
    notes: 'text',
    category: 'text',
    done: 'integer',
    done_at: 'text',
    done_by_user_id: 'text',
    due_date: 'text',
    quantity: 'integer',
    reason: 'text',
    source: 'text',
    rule_id: 'text',
    source_url: 'text',
    source_checked_at: 'text',
    owner_user_id: 'text',
    sort_order: 'integer',
    ...sync,
  },
} as const satisfies Record<string, Record<string, ColumnType>>;

/** Expenses (KAN-42/43). amount_minor is a whole number in minor units; fx_rate_date "2027-04-12". */
export const expenseTables = {
  expenses: {
    trip_id: 'text',
    created_by_user_id: 'text',
    paid_by_user_id: 'text',
    scope: 'text',
    owner_user_id: 'text',
    title: 'text',
    category: 'text',
    amount_minor: 'integer',
    currency: 'text',
    spent_at: 'text',
    fx_rate_date: 'text',
    place_id: 'text',
    note: 'text',
    ...sync,
  },
} as const satisfies Record<string, Record<string, ColumnType>>;

/**
 * Photos (KAN-39/40). The files are not in the database: the phone keeps them under the photo's
 * id (services/photoFiles). Booleans are 0/1; file_key … uploaded_at are set by the server.
 */
export const mediaTables = {
  media: {
    owner_user_id: 'text',
    trip_id: 'text',
    place_id: 'text',
    media_type: 'text',
    purpose: 'text',
    scope: 'text',
    source: 'text',
    is_suggested: 'integer',
    caption: 'text',
    taken_at: 'text',
    lat: 'real',
    lng: 'real',
    country_code: 'text',
    width: 'integer',
    height: 'integer',
    mime_type: 'text',
    duration_sec: 'integer',
    content_hash: 'text',
    quality_tier: 'text',
    file_key: 'text',
    thumbnail_key: 'text',
    size_bytes: 'integer',
    uploaded_at: 'text',
    include_in_video: 'integer',
    sort_order: 'integer',
    ...sync,
  },
} as const satisfies Record<string, Record<string, ColumnType>>;

/**
 * Settings (KAN-21/22): one row per account, its id is the user id. Booleans are 0/1, times "19:00".
 * Synced so every phone of the user has the same reminder switches and units.
 */
export const settingsTables = {
  user_settings: {
    reminders_enabled: 'integer',
    remind_checklist: 'integer',
    remind_pack_tonight: 'integer',
    remind_flight: 'integer',
    remind_anniversary: 'integer',
    reminder_time: 'text',
    quiet_hours_start: 'text',
    quiet_hours_end: 'text',
    distance_unit: 'text',
    temperature_unit: 'text',
    default_place_scope: 'text',
    ...sync,
  },
} as const satisfies Record<string, Record<string, ColumnType>>;

/** Every table PowerSync keeps on the phone and the app writes. */
export const syncedTables = {
  ...tripTables,
  ...checklistTables,
  ...expenseTables,
  ...mediaTables,
  ...settingsTables,
};

export type SyncedTableName = keyof typeof syncedTables;
export const syncedTableNames = Object.keys(syncedTables) as SyncedTableName[];

/** Set by the server only. The phone keeps them for reading but never sends them. */
export const serverColumns = new Set([
  'id',
  'owner_id',
  'created_by_user_id',
  'owner_user_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'version',
  'done_by_user_id',
  'paid_by_user_id',
  'file_key',
  'thumbnail_key',
  'size_bytes',
  'uploaded_at',
]);
