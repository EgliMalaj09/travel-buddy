import type { Trip, TripStop } from '@/data/types';
import { buildMockData } from '@/data/mock/mockTrips';

import { addDays, daysBetween, formatDateRange } from '../dates';
import { flagEmoji, groupTrips, phaseLine, stopDates, tripCountries, tripGroup } from '../trips';

const TODAY = '2027-03-01';
const { trips, stops } = buildMockData(TODAY);
const byId = (id: string) => trips.find((t) => t.id === id) as Trip;

describe('dates', () => {
  it('counts days and adds days across months', () => {
    expect(daysBetween('2027-02-27', '2027-03-02')).toBe(3);
    expect(addDays('2027-02-27', 3)).toBe('2027-03-02');
  });

  it('formats ranges and missing dates', () => {
    expect(formatDateRange(null, null)).toBe('Dates not set');
    expect(formatDateRange('2027-04-12', '2027-04-18')).toBe('12 Apr – 18 Apr 2027');
  });
});

describe('trip groups', () => {
  it('puts each sample trip in the right group', () => {
    expect(tripGroup(byId('trip-lisbon'), TODAY)).toBe('now');
    expect(tripGroup(byId('trip-rome-florence'), TODAY)).toBe('upcoming');
    expect(tripGroup(byId('trip-morocco'), TODAY)).toBe('someday');
    expect(tripGroup(byId('trip-alps'), TODAY)).toBe('past');
  });

  it('orders groups Now, Upcoming, Someday, Past', () => {
    expect(groupTrips(trips, TODAY).map((g) => g.group)).toEqual([
      'now',
      'upcoming',
      'someday',
      'past',
    ]);
  });

  it('leaves out deleted trips', () => {
    const deleted = { ...byId('trip-morocco'), deletedAt: '2027-01-01T00:00:00Z' };
    const groups = groupTrips([deleted], TODAY);
    expect(groups).toEqual([]);
  });

  it('shows countdown and day of trip', () => {
    expect(phaseLine(byId('trip-rome-florence'), TODAY)).toBe('In 23 days');
    expect(phaseLine(byId('trip-lisbon'), TODAY)).toBe('Day 3 of 7');
    expect(phaseLine(byId('trip-morocco'), TODAY)).toBe('');
  });
});

describe('stops', () => {
  const romeStops = stops.filter((s) => s.tripId === 'trip-rome-florence') as TripStop[];

  it('computes arrival and departure from nights', () => {
    const start = byId('trip-rome-florence').startDate;
    const [rome, florence] = stopDates(start, romeStops);
    expect(rome?.arrive).toBe(start);
    expect(rome?.leave).toBe(addDays(start!, 4));
    expect(florence?.arrive).toBe(addDays(start!, 4));
    expect(florence?.leave).toBe(addDays(start!, 7));
  });

  it('has no dates when the trip has no start date', () => {
    expect(stopDates(null, romeStops).every((s) => s.arrive === null)).toBe(true);
  });

  it('lists unique countries in order and makes flags', () => {
    const alps = stops.filter((s) => s.tripId === 'trip-alps');
    expect(tripCountries(alps)).toEqual(['AT', 'CH', 'FR']);
    expect(flagEmoji('IT')).toBe('🇮🇹');
  });
});
