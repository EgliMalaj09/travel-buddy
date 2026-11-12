import { buildMockData } from '@/data/mock/mockTrips';
import type { Flight } from '@/data/types';

import { addDays } from '../dates';
import { todayPlan } from '../today';

const today = '2027-03-20';
const data = buildMockData(today);
const rome = data.trips.find((t) => t.id === 'trip-rome-florence')!;
const romeStops = data.stops.filter((s) => s.tripId === rome.id);
const romeFlights = data.flights.filter((f) => f.tripId === rome.id);
const day = (n: number) => addDays(rome.startDate!, n);
const texts = (flights: Flight[], d: string) =>
  todayPlan(rome, romeStops, flights, d).map((i) => i.text);

describe('todayPlan', () => {
  it('is empty before and after the trip', () => {
    expect(texts(romeFlights, day(-1))).toEqual([]);
    expect(texts(romeFlights, day(8))).toEqual([]);
  });

  it('first day: the flight out and tonight in the first city', () => {
    expect(todayPlan(rome, romeStops, romeFlights, day(0))).toEqual([
      { key: 'first', icon: 'flag-outline', text: 'First day of the trip' },
      {
        key: 'flight-trip-rome-florence-flight-0',
        icon: 'airplane-outline',
        text: 'Flight Wizz Air W6 4567 · TIA → FCO',
        detail: 'Takes off at 09:40',
      },
      { key: 'tonight', icon: 'bed-outline', text: 'Tonight in Rome' },
    ]);
  });

  it('a normal day: only tonight', () => {
    expect(texts(romeFlights, day(2))).toEqual(['Tonight in Rome']);
  });

  it('a travel day between two cities (4 nights in Rome, then Florence)', () => {
    expect(texts(romeFlights, day(4))).toEqual(['Rome → Florence today', 'Tonight in Florence']);
  });

  it('last day: the flight home', () => {
    expect(texts(romeFlights, day(7))).toEqual([
      'Flight FLR → TIA',
      'Last day of the trip. Safe journey home!',
    ]);
  });
});
