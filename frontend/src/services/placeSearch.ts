import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { validPosition, type GeoPlace } from '@/lib/map';

/**
 * Place search for the map (KAN-37): our server's GET /geo/search and /geo/reverse, Photon behind
 * them. The phone never calls the search provider itself. Nothing typed or found is kept on the
 * phone or logged (GDPR core rule): results only live in the screen while it is open.
 */
type GeoPlaceDto = components['schemas']['GeoPlaceDto'];

export const SEARCH_MIN_LETTERS = 3;

export interface SearchAnswer {
  places: GeoPlace[];
  attribution: string;
}

/** Why a search gave nothing: offline / server or provider down, or too many calls. */
export class PlaceSearchError extends Error {
  constructor(readonly reason: 'unavailable' | 'busy') {
    super(reason === 'busy' ? 'Too many searches. Wait a moment.' : 'Search needs internet.');
    this.name = 'PlaceSearchError';
  }
}

function toPlace(d: GeoPlaceDto): GeoPlace | null {
  const lat = Number(d.lat);
  const lng = Number(d.lng);
  if (!validPosition(lat, lng) || !/^[A-Z]{2}$/.test(d.countryCode)) return null;
  return {
    name: d.name,
    address: d.address,
    cityName: d.cityName,
    countryCode: d.countryCode,
    lat,
    lng,
    geoProviderId: d.geoProviderId,
    category: d.category,
  };
}

function fail(status: number | undefined): never {
  throw new PlaceSearchError(status === 429 ? 'busy' : 'unavailable');
}

/**
 * Places matching the text. `near` (where the traveller is that day) puts nearby ones first;
 * the server rounds it to about 11 km before it passes it on.
 */
export async function searchPlaces(
  text: string,
  near: { lat: number; lng: number } | null,
  signal?: AbortSignal,
): Promise<SearchAnswer> {
  const q = text.trim();
  if (q.length < SEARCH_MIN_LETTERS) return { places: [], attribution: '' };
  let result;
  try {
    result = await api.GET('/geo/search', {
      params: { query: near ? { q, lat: near.lat, lng: near.lng } : { q } },
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    fail(undefined);
  }
  const { data, response } = result;
  if (!response.ok || !data) fail(response.status);
  return {
    places: data.places.map(toPlace).filter((p): p is GeoPlace => p !== null),
    attribution: data.attribution,
  };
}

/** What is at the point (after the pin was moved), or null when nothing or offline. */
export async function reversePlace(lat: number, lng: number): Promise<GeoPlace | null> {
  try {
    const { data, response } = await api.GET('/geo/reverse', {
      params: { query: { lat, lng } },
    });
    return response.ok && data?.place ? toPlace(data.place) : null;
  } catch {
    return null;
  }
}
