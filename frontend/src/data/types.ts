/**
 * App-side types for the records the app uses so far.
 * Field names MUST match decisions/data-model.md. When the backend OpenAPI file exists,
 * API types are generated from it; these types describe the local database rows.
 */

/** ISO 8601 date, e.g. "2027-04-12" */
export type IsoDate = string;
/** ISO 8601 date-time with offset, e.g. "2027-04-12T09:40:00+02:00" */
export type IsoDateTime = string;
/** ISO 3166-1 alpha-2 country code, e.g. "IT" */
export type CountryCode = string;
/** ISO 4217 currency code, e.g. "EUR" */
export type CurrencyCode = string;

export interface SyncFields {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  deletedAt: IsoDateTime | null;
  version: number;
}

export type TripActivity =
  | 'beach'
  | 'city'
  | 'culture'
  | 'food'
  | 'hiking'
  | 'skiing'
  | 'road_trip'
  | 'business'
  | 'relaxing';

export interface Trip extends SyncFields {
  id: string;
  ownerId: string;
  name: string;
  type: 'solo' | 'shared';
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  activities: TripActivity[];
  status: 'planned' | 'finished';
  finishedAt: IsoDateTime | null;
  coverMediaId: string | null;
  passportCountrySnapshot: CountryCode;
  homeCurrencySnapshot: CurrencyCode;
  checklistGeneratedAt: IsoDateTime | null;
  checklistRulesVersion: string | null;
  anniversaryEnabled: boolean;
}

export interface TripStop extends SyncFields {
  id: string;
  tripId: string;
  order: number;
  countryCode: CountryCode;
  cityName: string;
  /** Empty when the city was typed offline; filled in when the phone is online. */
  lat: number | null;
  lng: number | null;
  geoProviderId: string | null;
  nights: number;
}

/** Local date-time at an airport, no offset, e.g. "2027-04-12T09:40" */
export type LocalDateTime = string;

export type FlightDirection = 'outbound' | 'return' | 'other';

/** Data model 8b (agreed 11 Nov 2026). Every detail is optional. */
export interface Flight extends SyncFields {
  id: string;
  tripId: string;
  order: number;
  direction: FlightDirection;
  airline: string | null;
  flightNumber: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  departureLocalTime: LocalDateTime | null;
  arrivalLocalTime: LocalDateTime | null;
  /** IANA zone, e.g. "Europe/Tirane" */
  departureTimeZone: string | null;
  arrivalTimeZone: string | null;
  bookingCode: string | null;
  seat: string | null;
  terminal: string | null;
}

export type PlaceStatus = 'bucket' | 'planned' | 'visited';
export type PlaceCategory = 'food' | 'sight' | 'stay' | 'transport' | 'other';

/**
 * Data model 11 (AGREED: D1, D2). One record follows a place from bucket list to planned to visited.
 * `lat`/`lng` are empty until the place has a position (Places, 12 Nov 2026: the app fills in the
 * city of that trip day when it knows it; an exact spot comes with the Map, KAN-37).
 */
export interface Place extends SyncFields {
  id: string;
  /** Empty only for bucket-list places. */
  tripId: string | null;
  createdByUserId: string;
  ownerUserId: string | null;
  scope: 'shared' | 'personal';
  status: PlaceStatus;
  title: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  countryCode: CountryCode;
  cityName: string | null;
  address: string | null;
  geoProviderId: string | null;
  category: PlaceCategory;
  /** The trip day it is planned for; empty means "any day". */
  plannedDate: IsoDate | null;
  visitedAt: IsoDateTime | null;
  source: 'manual' | 'autocapture';
  isSuggested: boolean;
  coverMediaId: string | null;
  copiedFromPlaceId: string | null;
}

export type ExpenseCategory = 'food' | 'transport' | 'stay' | 'activities' | 'shopping' | 'other';

/**
 * Data model 13 (AGREED: D5, D7, D8; splitting D6 comes in Part 2). The amount stays in the
 * currency it was paid in, in minor units. The home-currency amount is never stored: it is worked
 * out from the daily rate of `fxRateDate`.
 */
export interface Expense extends SyncFields {
  id: string;
  tripId: string;
  /** Set by the server. */
  createdByUserId: string;
  /** Set by the server (Part 1: always the creator). */
  paidByUserId: string;
  scope: 'shared' | 'personal';
  ownerUserId: string | null;
  title: string;
  category: ExpenseCategory;
  /** In `currency`, minor units (1250 = 12.50 EUR). */
  amountMinor: number;
  /** ISO 4217. */
  currency: string;
  spentAt: IsoDateTime;
  /** The local day it was paid. Decides which daily rate is used. */
  fxRateDate: IsoDate;
  placeId: string | null;
  note: string | null;
}

/**
 * A photo of a trip (data model section 12, KAN-39). V1: photos only (D16), every photo "shared" and
 * owned by the person who added it (D3). The file itself is not here: the phone keeps it under the
 * photo's id (services/photoFiles) and the server sets fileKey, thumbnailKey and uploadedAt once
 * it has the file (D4).
 */
export interface Media extends SyncFields {
  id: string;
  /** Set by the server: who added it. */
  ownerUserId: string;
  tripId: string;
  placeId: string | null;
  mediaType: 'photo' | 'video';
  purpose: 'trip_photo' | 'avatar';
  scope: 'shared' | 'personal';
  source: 'camera' | 'library' | 'autocapture';
  isSuggested: boolean;
  /** The user's note on the photo. */
  caption: string | null;
  /** When the photo was taken (from the photo), else empty. */
  takenAt: IsoDateTime | null;
  lat: number | null;
  lng: number | null;
  countryCode: CountryCode | null;
  width: number;
  height: number;
  mimeType: string;
  /** SHA-256 of the original file, lowercase hex: stops the same photo being added twice. */
  contentHash: string;
  qualityTier: 'compressed' | 'full';
  /** Server only. */
  fileKey: string | null;
  thumbnailKey: string | null;
  sizeBytes: number | null;
  /** Server only. Empty = the file is not on the server yet. */
  uploadedAt: IsoDateTime | null;
  includeInVideo: boolean;
  sortOrder: number | null;
}

export type ChecklistItemType = 'task' | 'packing';

export type TaskCategory =
  'documents' | 'money' | 'health' | 'phone' | 'transport' | 'stay' | 'other';

export type PackingCategory = 'clothes' | 'toiletries' | 'tech' | 'documents' | 'other';

/** Why an item is on the list. */
export type ChecklistReason = 'rule' | 'weather' | 'activity' | 'user';

/** Data model 10 (AGREED). Tasks and packing items share one table. */
export interface ChecklistItem extends SyncFields {
  id: string;
  tripId: string;
  type: ChecklistItemType;
  title: string;
  notes: string | null;
  category: TaskCategory | PackingCategory;
  /** Done (task) or packed (packing). */
  done: boolean;
  doneAt: IsoDateTime | null;
  /** Set by the server. */
  doneByUserId: string | null;
  dueDate: IsoDate | null;
  /** Packing only. */
  quantity: number | null;
  reason: ChecklistReason;
  /** "auto": made from the rules. "user": added or changed by hand. */
  source: 'auto' | 'user';
  /** The rule that made it. Kept after an edit, so the rule does not add it again. */
  ruleId: string | null;
  /** Entry-rule items: where to check, with the "check official sources" note. */
  sourceUrl: string | null;
  sourceCheckedAt: IsoDate | null;
  /** Only for personal packing items in shared trips (Part 2). Set by the server. */
  ownerUserId: string | null;
  sortOrder: number;
}
