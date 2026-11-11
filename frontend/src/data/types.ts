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
  flightOutAt: IsoDateTime | null;
  flightBackAt: IsoDateTime | null;
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
  lat: number;
  lng: number;
  geoProviderId: string | null;
  nights: number;
}
