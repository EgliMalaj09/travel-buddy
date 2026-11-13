import { buildMockData } from '@/data/mock/mockTrips';
import type { Trip, TripStop } from '@/data/types';

import { addDays } from '../dates';
import { countdown, currentStop, formatFlightTime, greeting, homeFocus, nextFlight } from '../home';

const today = '2027-04-01';
const data = buildMockData(today);
const byId = (id: string) => data.trips.find((t) => t.id === id)!;
const stopsOf = (id: string) => data.stops.filter((s) => s.tripId === id);

describe('homeFocus', () => {
  it('picks the trip happening now first', () => {
    expect(homeFocus(data.trips, today)).toMatchObject({
      trip: { id: 'trip-lisbon' },
      kind: 'now',
    });
  });

  it('falls back to the next upcoming trip', () => {
    const trips = data.trips.filter((t) => t.id !== 'trip-lisbon');
    expect(homeFocus(trips, today)).toMatchObject({
      trip: { id: 'trip-rome-florence' },
      kind: 'upcoming',
    });
  });

  it('is null when only someday and past trips exist', () => {
    const trips = data.trips.filter((t) => ['trip-morocco', 'trip-alps'].includes(t.id));
    expect(homeFocus(trips, today)).toBeNull();
  });
});

describe('countdown', () => {
  it('counts days to an upcoming trip', () => {
    const trip = byId('trip-rome-florence');
    expect(countdown({ trip, kind: 'upcoming' }, today)).toEqual({
      value: '23',
      label: 'days to go',
    });
    expect(countdown({ trip, kind: 'upcoming' }, addDays(trip.startDate!, -1))).toEqual({
      value: '1',
      label: 'day to go',
    });
  });

  it('shows the day of a trip happening now', () => {
    expect(countdown({ trip: byId('trip-lisbon'), kind: 'now' }, today)).toEqual({
      value: 'Day 3',
      label: 'of 7',
    });
  });
});

describe('currentStop', () => {
  const trip = { ...byId('trip-rome-florence') } as Trip;
  const stops = stopsOf(trip.id) as TripStop[];

  it('finds the city of tonight', () => {
    expect(currentStop(trip, stops, trip.startDate!)?.cityName).toBe('Rome');
    expect(currentStop(trip, stops, addDays(trip.startDate!, 4))?.cityName).toBe('Florence');
  });

  it('uses the last stop on the last day', () => {
    expect(currentStop(trip, stops, trip.endDate!)?.cityName).toBe('Florence');
  });
});

describe('nextFlight', () => {
  const flights = data.flights;
  it('returns the first flight from today on', () => {
    expect(nextFlight(flights, today)?.direction).toBe('outbound');
    expect(nextFlight(flights, addDays(today, 24))?.direction).toBe('return');
    expect(nextFlight(flights, addDays(today, 31))).toBeNull();
  });

  it('formats the departure time', () => {
    expect(formatFlightTime('2027-04-12T09:40')).toBe('Mon 12 Apr · 09:40');
  });
});

describe('greeting', () => {
  it('follows the time of day', () => {
    expect(greeting(8)).toBe('Good morning');
    expect(greeting(14)).toBe('Good afternoon');
    expect(greeting(21)).toBe('Good evening');
    expect(greeting(2)).toBe('Good evening');
  });
});
