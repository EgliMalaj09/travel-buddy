import type { IsoDate, Place, PlaceCategory, PlaceStatus, TripStop } from '@/data/types';

/**
 * The trip map (KAN-37): plain helpers shared by the map screens and their tests.
 * Map: MapLibre with OpenFreeMap tiles (free, no key). Search: Photon through our server.
 * Choices in decisions/features/09-map.md.
 */

/** [longitude, latitude], the order map libraries use. */
export type LngLat = [number, number];
/** [west, south, east, north] */
export type LngLatBounds = [number, number, number, number];

/** OpenFreeMap's "Liberty" style: free, no key, no sign-up, OpenStreetMap data. */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Shown on every map (OpenStreetMap ODbL and OpenFreeMap terms ask for it). */
export const MAP_ATTRIBUTION = 'OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors';
export const MAP_ATTRIBUTION_URL = 'https://www.openstreetmap.org/copyright';

/** geo_provider_id of a spot set by moving the pin on the map (search results keep "osm:…"). */
export const PIN_PROVIDER_ID = 'pin';

/** Zoom for one place on its own, and for a city when there are no exact places. */
export const PLACE_ZOOM = 15;
export const CITY_ZOOM = 11;

/**
 * Where a place is. `geoProviderId` empty = only the city of that day is known (Places, 12 Nov 2026).
 * Set = an exact spot from the search ("osm:…") or from the map pin ("pin").
 */
export interface Spot {
  lat: number;
  lng: number;
  countryCode: string;
  cityName: string | null;
  address: string | null;
  geoProviderId: string;
}

/** 6 decimals is about 10 cm: more is noise, and keeps rows small. */
export function roundCoord(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function validPosition(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** True when the place has its own exact spot (not just the city of that day). */
export function hasExactSpot(place: Pick<Place, 'lat' | 'lng' | 'geoProviderId'>): boolean {
  return !!place.geoProviderId && validPosition(place.lat, place.lng);
}

/** The place's exact spot, or null when only the city is known. */
export function spotOf(
  place: Pick<
    Place,
    'lat' | 'lng' | 'geoProviderId' | 'countryCode' | 'cityName' | 'address'
  > | null,
): Spot | null {
  if (!place || !hasExactSpot(place)) return null;
  return {
    lat: place.lat!,
    lng: place.lng!,
    countryCode: place.countryCode,
    cityName: place.cityName,
    address: place.address,
    geoProviderId: place.geoProviderId!,
  };
}

/** One search answer, mapped from the generated GeoPlaceDto in services/placeSearch.ts. */
export interface GeoPlace {
  name: string;
  address?: string | null;
  cityName?: string | null;
  countryCode: string;
  lat: number;
  lng: number;
  geoProviderId: string;
  category?: string | null;
}

const categories: PlaceCategory[] = ['sight', 'food', 'stay', 'transport', 'other'];

/** The search's suggested category, when it is one of ours. */
export function suggestedCategory(result: Pick<GeoPlace, 'category'>): PlaceCategory | null {
  const c = result.category;
  return c && (categories as string[]).includes(c) ? (c as PlaceCategory) : null;
}

/** A search result as the place's spot. */
export function spotFromSearch(result: GeoPlace): Spot {
  return {
    lat: roundCoord(result.lat),
    lng: roundCoord(result.lng),
    countryCode: result.countryCode,
    cityName: result.cityName ?? null,
    address: result.address ?? null,
    geoProviderId: result.geoProviderId,
  };
}

/**
 * A spot set by moving the pin. The point is the traveller's; what is there (address, city,
 * country) comes from the reverse search when online, else from the place's current values.
 */
export function spotFromPin(
  point: { lat: number; lng: number },
  found: GeoPlace | null,
  fallback: { countryCode: string; cityName: string | null },
): Spot {
  return {
    lat: roundCoord(point.lat),
    lng: roundCoord(point.lng),
    countryCode: found?.countryCode ?? fallback.countryCode,
    cityName: found ? (found.cityName ?? null) : fallback.cityName,
    address: found ? (found.address ?? found.name) : null,
    geoProviderId: PIN_PROVIDER_ID,
  };
}

/** One line for the form: "Piazza del Colosseo 1, Rome" or "41.890210, 12.492231". */
export function spotLabel(spot: Spot): string {
  return spot.address || `${spot.lat.toFixed(6)}, ${spot.lng.toFixed(6)}`;
}

export interface MapPin {
  id: string;
  lngLat: LngLat;
  title: string;
  status: PlaceStatus;
  category: PlaceCategory;
  plannedDate: IsoDate | null;
}

/** Day filter on the map: every day, "any day" places, or one trip day. */
export type MapDayFilter = 'all' | 'any' | IsoDate;

function matchesDay(place: Pick<Place, 'plannedDate'>, day: MapDayFilter): boolean {
  if (day === 'all') return true;
  if (day === 'any') return place.plannedDate === null;
  return place.plannedDate === day;
}

/** Pins for the places with an exact spot, filtered by day. */
export function placePins(places: Place[], day: MapDayFilter = 'all'): MapPin[] {
  return places
    .filter((p) => !p.deletedAt && hasExactSpot(p) && matchesDay(p, day))
    .map((p) => ({
      id: p.id,
      lngLat: [p.lng!, p.lat!] as LngLat,
      title: p.title,
      status: p.status,
      category: p.category,
      plannedDate: p.plannedDate,
    }));
}

/** Places of that day that are not on the map yet (only the city is known). */
export function placesWithoutSpot(places: Place[], day: MapDayFilter = 'all'): Place[] {
  return places.filter((p) => !p.deletedAt && !hasExactSpot(p) && matchesDay(p, day));
}

/** City markers for the trip's stops that have a position. */
export function stopPins(
  stops: TripStop[],
): { id: string; lngLat: LngLat; cityName: string; order: number }[] {
  return stops
    .filter((s) => !s.deletedAt && validPosition(s.lat, s.lng))
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      lngLat: [s.lng!, s.lat!] as LngLat,
      cityName: s.cityName,
      order: s.order,
    }));
}

/** The box around the points, or null for fewer than two different points. */
export function boundsOf(points: LngLat[]): LngLatBounds | null {
  if (points.length < 2) return null;
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  if (west === east && south === north) return null;
  return [west, south, east, north];
}

/** Where the map opens: around the pins, else around the stops, else the world. */
export type MapView =
  { kind: 'bounds'; bounds: LngLatBounds } | { kind: 'center'; center: LngLat; zoom: number };

export function openingView(pins: LngLat[], stops: LngLat[]): MapView {
  const points = pins.length ? pins : stops;
  const bounds = boundsOf(points);
  if (bounds) return { kind: 'bounds', bounds };
  if (points[0])
    return { kind: 'center', center: points[0], zoom: pins.length ? PLACE_ZOOM : CITY_ZOOM };
  return { kind: 'center', center: [10, 30], zoom: 1 };
}
