import type { ChecklistItem, Flight, Trip, TripActivity, TripStop } from '../types';

/** A row as SQLite returns it. */
export type Row = Record<string, unknown>;

const text = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));

/**
 * Times come from PostgreSQL as "2026-11-12 10:00:00.123Z" (space, maybe no offset) and from
 * the phone as ISO text. The app uses ISO: "2026-11-12T10:00:00.123Z".
 */
export function isoTime(v: unknown): string | null {
  const s = text(v);
  if (!s) return null;
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  return /([zZ]|[+-]\d\d(:?\d\d)?)$/.test(iso) ? iso : `${iso}Z`;
}

/** A local airport time without offset, kept as "2027-04-12T09:40". */
export function localTime(v: unknown): string | null {
  const s = text(v);
  return s ? s.replace(' ', 'T').slice(0, 16) : null;
}

/** A date, "2027-04-12". */
const date = (v: unknown) => text(v)?.slice(0, 10) ?? null;

/** Lists are JSON text ('["city"]'); a PostgreSQL list literal ("{city,food}") is read too. */
export function textList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  const s = text(v)?.trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(s);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    const inner = s.slice(1, -1);
    return inner ? inner.split(',').map((x) => x.replace(/^"|"$/g, '')) : [];
  }
  return [];
}

const sync = (r: Row) => ({
  createdAt: isoTime(r.created_at) ?? '',
  updatedAt: isoTime(r.updated_at) ?? '',
  deletedAt: isoTime(r.deleted_at),
  version: num(r.version) ?? 0,
});

export function rowToTrip(r: Row): Trip {
  return {
    id: String(r.id),
    ownerId: text(r.owner_id) ?? '',
    name: text(r.name) ?? '',
    type: (text(r.type) ?? 'solo') as Trip['type'],
    startDate: date(r.start_date),
    endDate: date(r.end_date),
    activities: textList(r.activities) as TripActivity[],
    status: (text(r.status) ?? 'planned') as Trip['status'],
    finishedAt: isoTime(r.finished_at),
    coverMediaId: text(r.cover_media_id),
    passportCountrySnapshot: text(r.passport_country_snapshot) ?? '',
    homeCurrencySnapshot: text(r.home_currency_snapshot) ?? '',
    checklistGeneratedAt: isoTime(r.checklist_generated_at),
    checklistRulesVersion: text(r.checklist_rules_version),
    anniversaryEnabled: r.anniversary_enabled == null ? true : Boolean(num(r.anniversary_enabled)),
    ...sync(r),
  };
}

export function rowToStop(r: Row): TripStop {
  return {
    id: String(r.id),
    tripId: text(r.trip_id) ?? '',
    order: num(r.order) ?? 0,
    countryCode: text(r.country_code) ?? '',
    cityName: text(r.city_name) ?? '',
    lat: num(r.lat),
    lng: num(r.lng),
    geoProviderId: text(r.geo_provider_id),
    nights: num(r.nights) ?? 0,
    ...sync(r),
  };
}

export function rowToFlight(r: Row): Flight {
  return {
    id: String(r.id),
    tripId: text(r.trip_id) ?? '',
    order: num(r.order) ?? 0,
    direction: (text(r.direction) ?? 'other') as Flight['direction'],
    airline: text(r.airline),
    flightNumber: text(r.flight_number),
    departureAirport: text(r.departure_airport),
    arrivalAirport: text(r.arrival_airport),
    departureLocalTime: localTime(r.departure_local_time),
    arrivalLocalTime: localTime(r.arrival_local_time),
    departureTimeZone: text(r.departure_time_zone),
    arrivalTimeZone: text(r.arrival_time_zone),
    bookingCode: text(r.booking_code),
    seat: text(r.seat),
    terminal: text(r.terminal),
    ...sync(r),
  };
}

export function rowToChecklistItem(r: Row): ChecklistItem {
  return {
    id: String(r.id),
    tripId: text(r.trip_id) ?? '',
    type: (text(r.type) ?? 'task') as ChecklistItem['type'],
    title: text(r.title) ?? '',
    notes: text(r.notes),
    category: (text(r.category) ?? 'other') as ChecklistItem['category'],
    done: r.done === true || r.done === 'true' || num(r.done) === 1,
    doneAt: isoTime(r.done_at),
    doneByUserId: text(r.done_by_user_id),
    dueDate: date(r.due_date),
    quantity: num(r.quantity),
    reason: (text(r.reason) ?? 'user') as ChecklistItem['reason'],
    source: (text(r.source) ?? 'user') as ChecklistItem['source'],
    ruleId: text(r.rule_id),
    sourceUrl: text(r.source_url),
    sourceCheckedAt: date(r.source_checked_at),
    ownerUserId: text(r.owner_user_id),
    sortOrder: num(r.sort_order) ?? 0,
    ...sync(r),
  };
}
