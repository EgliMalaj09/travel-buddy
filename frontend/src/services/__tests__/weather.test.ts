import type { TripStop } from '@/data/types';

import { clearWeatherCache, getTripWeather, type FetchDays } from '../weather';

const stop: TripStop = {
  id: 's1',
  tripId: 't1',
  order: 1,
  countryCode: 'IT',
  cityName: 'Rome',
  lat: 41.9,
  lng: 12.5,
  geoProviderId: null,
  nights: 3,
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
  version: 1,
};
const trip = { id: 't1', startDate: '2027-04-12' };
const at = (iso: string) => new Date(iso);
const answer = {
  days: [
    {
      date: '2027-04-12',
      kind: 'forecast' as const,
      minC: 10,
      maxC: 20,
      precipitationMm: 0,
      precipitationChance: 10,
      snowCm: 0,
    },
  ],
  attribution: 'Weather data by Open-Meteo.com',
  attributionUrl: 'https://open-meteo.com/',
};

describe('trip weather on the phone', () => {
  beforeEach(() => clearWeatherCache());

  it('keeps the answer for 3 hours, then asks again', async () => {
    const fetchDays = jest.fn<ReturnType<FetchDays>, Parameters<FetchDays>>(async () => answer);
    const first = await getTripWeather(trip, [stop], {
      now: at('2027-04-10T08:00:00Z'),
      fetchDays,
    });
    expect(first?.stops[0]?.days).toHaveLength(1);
    expect(first?.stale).toBe(false);
    await getTripWeather(trip, [stop], { now: at('2027-04-10T10:00:00Z'), fetchDays });
    expect(fetchDays).toHaveBeenCalledTimes(1);
    await getTripWeather(trip, [stop], { now: at('2027-04-10T11:30:00Z'), fetchDays });
    expect(fetchDays).toHaveBeenCalledTimes(2);
  });

  it('offline: the last answer marked stale, or nothing the first time; waits a minute before retrying', async () => {
    const down = jest.fn<ReturnType<FetchDays>, Parameters<FetchDays>>(async () => null);
    expect(
      await getTripWeather(trip, [stop], { now: at('2027-04-10T08:00:00Z'), fetchDays: down }),
    ).toBeNull();
    await getTripWeather(trip, [stop], { now: at('2027-04-10T08:00:30Z'), fetchDays: down });
    expect(down).toHaveBeenCalledTimes(1);

    await getTripWeather(trip, [stop], {
      now: at('2027-04-10T08:02:00Z'),
      fetchDays: async () => answer,
    });
    const stale = await getTripWeather(trip, [stop], {
      now: at('2027-04-10T12:00:00Z'),
      fetchDays: down,
    });
    expect(stale?.stale).toBe(true);
    expect(stale?.stops[0]?.days).toHaveLength(1);
  });

  it('a changed stop or date is not shown old weather', async () => {
    await getTripWeather(trip, [stop], {
      now: at('2027-04-10T08:00:00Z'),
      fetchDays: async () => answer,
    });
    const moved = await getTripWeather({ ...trip, startDate: '2027-04-20' }, [stop], {
      now: at('2027-04-10T08:10:00Z'),
      fetchDays: async () => null,
    });
    expect(moved).toBeNull();
  });

  it('no request without positions', async () => {
    const fetchDays = jest.fn<ReturnType<FetchDays>, Parameters<FetchDays>>(async () => answer);
    expect(await getTripWeather(trip, [{ ...stop, lat: null }], { fetchDays })).toBeNull();
    expect(fetchDays).not.toHaveBeenCalled();
  });
});
