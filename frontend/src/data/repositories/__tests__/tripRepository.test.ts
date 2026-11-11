import { createBuiltInCitySearch } from '@/services/citySearch';

import { createMockTripRepository, type TripInput } from '../tripRepository';

const owner = { ownerId: 'user-1', passportCountry: 'AL', homeCurrency: 'ALL' };
const empty = () => createMockTripRepository({ trips: [], stops: [], flights: [] });

const input: TripInput = {
  name: 'Rome & Florence',
  startDate: '2027-04-12',
  endDate: '2027-04-19',
  activities: ['city'],
  stops: [
    { cityName: 'Rome', countryCode: 'IT', lat: 41.9, lng: 12.5, geoProviderId: null, nights: 4 },
    {
      cityName: 'Florence',
      countryCode: 'IT',
      lat: null,
      lng: null,
      geoProviderId: null,
      nights: 3,
    },
  ],
  flights: [
    {
      direction: 'outbound',
      airline: 'Wizz Air',
      flightNumber: 'W6 4567',
      departureAirport: 'TIA',
      arrivalAirport: 'FCO',
      departureLocalTime: '2027-04-12T09:40',
      arrivalLocalTime: null,
      departureTimeZone: 'Europe/Tirane',
      arrivalTimeZone: null,
      bookingCode: null,
      seat: null,
      terminal: null,
    },
  ],
};

describe('mock trip repository', () => {
  it('creates a trip with its stops and flights and the owner snapshots', async () => {
    const repo = empty();
    const trip = await repo.createTrip(input, owner);
    expect(trip).toMatchObject({
      ownerId: 'user-1',
      type: 'solo',
      passportCountrySnapshot: 'AL',
      homeCurrencySnapshot: 'ALL',
    });
    const stops = await repo.listStops(trip.id);
    expect(stops.map((s) => [s.order, s.cityName, s.nights])).toEqual([
      [0, 'Rome', 4],
      [1, 'Florence', 3],
    ]);
    expect(await repo.listFlights(trip.id)).toHaveLength(1);
  });

  it('refuses a trip the backend would refuse', async () => {
    await expect(empty().createTrip({ ...input, stops: [] }, owner)).rejects.toThrow(
      /at least one stop/,
    );
    await expect(empty().createTrip({ ...input, endDate: '2027-04-01' }, owner)).rejects.toThrow(
      /before/,
    );
  });

  it('edits stops: keeps, changes, adds and removes', async () => {
    const repo = empty();
    const trip = await repo.createTrip(input, owner);
    const [rome] = await repo.listStops(trip.id);
    await repo.updateTrip(trip.id, {
      ...input,
      name: 'Italy',
      stops: [
        { ...rome!, nights: 2 },
        {
          cityName: 'Venice',
          countryCode: 'IT',
          lat: 45.4,
          lng: 12.3,
          geoProviderId: null,
          nights: 5,
        },
      ],
      flights: [],
    });
    const stops = await repo.listStops(trip.id);
    expect(stops.map((s) => s.cityName)).toEqual(['Rome', 'Venice']);
    expect(stops[0]).toMatchObject({ id: rome!.id, nights: 2, version: 2 });
    expect(await repo.listFlights(trip.id)).toHaveLength(0);
    expect((await repo.getTrip(trip.id))?.name).toBe('Italy');
  });

  it('soft deletes a trip and everything in it', async () => {
    const repo = empty();
    const trip = await repo.createTrip(input, owner);
    await repo.deleteTrip(trip.id);
    expect(await repo.getTrip(trip.id)).toBeNull();
    expect(await repo.listTrips()).toHaveLength(0);
    expect(await repo.listStops(trip.id)).toHaveLength(0);
  });
});

describe('built-in city search', () => {
  const search = createBuiltInCitySearch();
  it('finds cities by name, without accents, and by country', async () => {
    expect((await search.search('rom'))[0]?.cityName).toBe('Rome');
    expect((await search.search('cesky')).map((c) => c.cityName)).toContain('Český Krumlov');
    expect((await search.search('albania')).length).toBeGreaterThan(5);
    expect(await search.search('  ')).toEqual([]);
  });
});
