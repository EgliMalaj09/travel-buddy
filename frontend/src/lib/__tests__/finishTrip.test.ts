import { buildMockData } from '@/data/mock/mockTrips';
import type { Place, Trip, TripStop } from '@/data/types';

import {
  canFinish,
  finishPrompt,
  passportStamps,
  ratingWord,
  stampDate,
  tripRecap,
} from '../finishTrip';

const today = '2027-03-20';
const data = buildMockData(today);
const trip = (id: string) => data.trips.find((t) => t.id === id)!;
const stopsByTrip = new Map<string, TripStop[]>(
  data.trips.map((t) => [t.id, data.stops.filter((s) => s.tripId === t.id)]),
);
const lisbon = trip('trip-lisbon');
const alps = trip('trip-alps');

describe('canFinish', () => {
  it('allows a started trip with dates that is not finished yet', () => {
    expect(canFinish(lisbon, today)).toBe(true);
    expect(canFinish(trip('trip-rome-florence'), today)).toBe(false); // not started
    expect(canFinish(trip('trip-morocco'), today)).toBe(false); // someday
    expect(canFinish(alps, today)).toBe(false); // already finished
    expect(canFinish({ ...lisbon, deletedAt: today }, today)).toBe(false);
  });
});

describe('finishPrompt', () => {
  const ended = (id: string, endDate: string): Trip => ({
    ...lisbon,
    id,
    startDate: '2027-01-01',
    endDate,
  });

  it('asks from the day after the end, the latest trip first, for 30 days', () => {
    expect(finishPrompt([lisbon], today)).toBeNull(); // still on the trip
    expect(finishPrompt([ended('a', '2027-03-19')], today)?.id).toBe('a');
    expect(finishPrompt([ended('a', '2027-03-01'), ended('b', '2027-03-10')], today)?.id).toBe('b');
    expect(finishPrompt([ended('old', '2027-02-17')], today)).toBeNull(); // 31 days ago
  });
});

describe('passportStamps', () => {
  it('gives each country of a finished trip one stamp, from the first trip that went there', () => {
    const stamps = passportStamps(data.trips, stopsByTrip);
    expect(stamps.every((s) => s.tripId === alps.id)).toBe(true);
    expect(stamps.map((s) => s.date)).toEqual(stamps.map(() => alps.endDate));

    const lisbonDone = { ...lisbon, status: 'finished' as const, finishedAt: today };
    const second = { ...lisbonDone, id: 'lisbon-again', endDate: '2027-12-01' };
    const more = new Map(stopsByTrip).set(
      second.id,
      stopsByTrip.get(lisbon.id)!.map((s) => ({ ...s, tripId: second.id })),
    );
    const after = passportStamps(
      [...data.trips.filter((t) => t.id !== lisbon.id), lisbonDone, second],
      more,
    );
    expect(after.filter((s) => s.countryCode === 'PT')).toEqual([
      { countryCode: 'PT', tripId: lisbon.id, date: lisbon.endDate },
    ]);
  });
});

describe('tripRecap', () => {
  it('counts days, visited places, photos, money and the new countries', () => {
    const lisbonDone = { ...lisbon, status: 'finished' as const, finishedAt: today };
    const trips = [...data.trips.filter((t) => t.id !== lisbon.id), lisbonDone];
    const visited = { status: 'visited', deletedAt: null } as Place;
    const planned = { status: 'planned', deletedAt: null } as Place;
    const recap = tripRecap({
      trip: lisbonDone,
      stops: stopsByTrip.get(lisbon.id)!,
      places: [visited, visited, planned],
      photoCount: 12,
      spent: { totalHome: 24510, pending: 1 },
      allTrips: trips,
      stopsByTrip,
    });
    expect(recap).toMatchObject({
      days: 7,
      placesVisited: 2,
      photos: 12,
      spentMinor: 24510,
      spentPending: 1,
      countries: ['PT'],
      newCountries: ['PT'],
    });
    expect(recap.countriesTotal).toBe(passportStamps(data.trips, stopsByTrip).length + 1);
  });
});

describe('words', () => {
  it('prints the stamp month and the rating word', () => {
    expect(stampDate('2026-11-13')).toBe('NOV 2026');
    expect(ratingWord(5)).toBe('Amazing');
    expect(ratingWord(0)).toBe('');
  });
});
