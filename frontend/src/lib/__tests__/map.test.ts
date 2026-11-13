import type { Place, TripStop } from '@/data/types';

import {
  boundsOf,
  hasExactSpot,
  openingView,
  PIN_PROVIDER_ID,
  placePins,
  placesWithoutSpot,
  roundCoord,
  spotFromPin,
  spotFromSearch,
  spotLabel,
  spotOf,
  stopPins,
  suggestedCategory,
} from '../map';

function place(over: Partial<Place>): Place {
  return {
    id: 'p',
    tripId: 't',
    createdByUserId: 'u',
    ownerUserId: null,
    scope: 'shared',
    status: 'planned',
    title: 'Place',
    note: null,
    lat: null,
    lng: null,
    countryCode: 'IT',
    cityName: 'Rome',
    address: null,
    geoProviderId: null,
    category: 'sight',
    plannedDate: null,
    visitedAt: null,
    source: 'manual',
    isSuggested: false,
    coverMediaId: null,
    copiedFromPlaceId: null,
    createdAt: '2027-01-01T00:00:00Z',
    updatedAt: '2027-01-01T00:00:00Z',
    deletedAt: null,
    version: 1,
    ...over,
  };
}

const exact = place({
  id: 'a',
  lat: 41.89,
  lng: 12.49,
  geoProviderId: 'osm:W:1',
  plannedDate: '2027-04-13',
});
const cityOnly = place({ id: 'b', lat: 41.9, lng: 12.5, plannedDate: '2027-04-13' });
const anyDay = place({
  id: 'c',
  lat: 41.91,
  lng: 12.48,
  geoProviderId: PIN_PROVIDER_ID,
  status: 'visited',
});
const deleted = place({
  id: 'd',
  lat: 41.9,
  lng: 12.5,
  geoProviderId: 'osm:N:2',
  deletedAt: '2027-01-02',
});

describe('trip map helpers (KAN-37)', () => {
  it('only a place with a provider id and a valid position has an exact spot', () => {
    expect(hasExactSpot(exact)).toBe(true);
    expect(hasExactSpot(cityOnly)).toBe(false);
    expect(hasExactSpot(place({ geoProviderId: 'pin', lat: 91, lng: 0 }))).toBe(false);
    expect(spotOf(cityOnly)).toBeNull();
    expect(spotOf(exact)).toMatchObject({ lat: 41.89, lng: 12.49, geoProviderId: 'osm:W:1' });
  });

  it('pins: exact places only, not deleted, filtered by day', () => {
    const all = [exact, cityOnly, anyDay, deleted];
    expect(placePins(all).map((p) => p.id)).toEqual(['a', 'c']);
    expect(placePins(all, '2027-04-13').map((p) => p.id)).toEqual(['a']);
    expect(placePins(all, 'any').map((p) => p.id)).toEqual(['c']);
    expect(placePins(all)[0]!.lngLat).toEqual([12.49, 41.89]);
    expect(placesWithoutSpot(all).map((p) => p.id)).toEqual(['b']);
    expect(placesWithoutSpot(all, 'any')).toEqual([]);
  });

  it('stops with a position become flags in trip order', () => {
    const stop = (id: string, order: number, lat: number | null) =>
      ({ id, order, lat, lng: lat, cityName: id, deletedAt: null }) as TripStop;
    expect(
      stopPins([stop('b', 1, 10), stop('a', 0, 5), stop('x', 2, null)]).map((s) => s.id),
    ).toEqual(['a', 'b']);
  });

  it('opens around the pins, else the stops, else one point or the world', () => {
    expect(boundsOf([[1, 2]])).toBeNull();
    expect(
      boundsOf([
        [1, 2],
        [1, 2],
      ]),
    ).toBeNull();
    expect(
      boundsOf([
        [1, 5],
        [3, 2],
      ]),
    ).toEqual([1, 2, 3, 5]);
    expect(
      openingView(
        [
          [1, 5],
          [3, 2],
        ],
        [],
      ),
    ).toEqual({ kind: 'bounds', bounds: [1, 2, 3, 5] });
    expect(
      openingView(
        [[1, 5]],
        [
          [9, 9],
          [8, 8],
        ],
      ),
    ).toEqual({ kind: 'center', center: [1, 5], zoom: 15 });
    expect(openingView([], [[9, 9]])).toEqual({ kind: 'center', center: [9, 9], zoom: 11 });
    expect(openingView([], [])).toMatchObject({ kind: 'center', zoom: 1 });
  });

  it('turns a search result and a moved pin into a spot', () => {
    const result = {
      name: 'Colosseum',
      address: 'Piazza del Colosseo 1, Rome',
      cityName: 'Rome',
      countryCode: 'IT',
      lat: 41.8902102456,
      lng: 12.4922309123,
      geoProviderId: 'osm:W:27',
      category: 'sight',
    };
    expect(spotFromSearch(result)).toEqual({
      lat: 41.89021,
      lng: 12.492231,
      countryCode: 'IT',
      cityName: 'Rome',
      address: 'Piazza del Colosseo 1, Rome',
      geoProviderId: 'osm:W:27',
    });
    expect(suggestedCategory(result)).toBe('sight');
    expect(suggestedCategory({ category: 'shop' })).toBeNull();
    expect(suggestedCategory({ category: null })).toBeNull();

    const fallback = { countryCode: 'IT', cityName: 'Rome' };
    const offline = spotFromPin({ lat: 41.1234567, lng: 12.7654321 }, null, fallback);
    expect(offline).toEqual({
      lat: 41.123457,
      lng: 12.765432,
      countryCode: 'IT',
      cityName: 'Rome',
      address: null,
      geoProviderId: 'pin',
    });
    expect(spotLabel(offline)).toBe('41.123457, 12.765432');
    const online = spotFromPin(
      { lat: 43.77, lng: 11.25 },
      { ...result, address: null, cityName: 'Florence' },
      fallback,
    );
    expect(online).toMatchObject({
      cityName: 'Florence',
      address: 'Colosseum',
      geoProviderId: 'pin',
    });
    expect(roundCoord(1.23456789)).toBe(1.234568);
  });
});
