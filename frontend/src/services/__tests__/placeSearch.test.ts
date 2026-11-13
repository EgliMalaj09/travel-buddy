import { PlaceSearchError, reversePlace, searchPlaces } from '../placeSearch';

const fetchMock = jest.fn();
const realFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const colosseum = {
  name: 'Colosseum',
  address: 'Piazza del Colosseo 1, Rome',
  cityName: 'Rome',
  countryCode: 'IT',
  lat: '41.89021',
  lng: 12.492231,
  geoProviderId: 'osm:W:27',
  category: 'sight',
};

describe('place search (KAN-37)', () => {
  it('asks our server with the text and the area, never the provider', async () => {
    fetchMock.mockResolvedValue(
      json(200, {
        places: [colosseum, { ...colosseum, countryCode: '', geoProviderId: 'x' }],
        attribution: 'OSM',
        attributionUrl: 'u',
      }),
    );
    const answer = await searchPlaces(' colosseum ', { lat: 41.9, lng: 12.5 });

    const url = new URL((fetchMock.mock.calls[0]![0] as Request).url);
    expect(url.pathname).toBe('/geo/search');
    expect(url.searchParams.get('q')).toBe('colosseum');
    expect(url.searchParams.get('lat')).toBe('41.9');
    expect(answer.places).toEqual([{ ...colosseum, lat: 41.89021 }]);
    expect(answer.attribution).toBe('OSM');
  });

  it('does not search for fewer than 3 letters', async () => {
    expect((await searchPlaces('ab', null)).places).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says why when the search fails', async () => {
    fetchMock.mockResolvedValueOnce(json(429, {}));
    await expect(searchPlaces('rome', null)).rejects.toMatchObject({ reason: 'busy' });
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(searchPlaces('rome', null)).rejects.toBeInstanceOf(PlaceSearchError);
  });

  it('reverse gives the place at the point, or null when offline', async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, { place: colosseum, attribution: 'OSM', attributionUrl: 'u' }),
    );
    expect(await reversePlace(41.89, 12.49)).toMatchObject({ name: 'Colosseum' });
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    expect(await reversePlace(41.89, 12.49)).toBeNull();
  });
});
