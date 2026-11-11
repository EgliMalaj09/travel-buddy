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
