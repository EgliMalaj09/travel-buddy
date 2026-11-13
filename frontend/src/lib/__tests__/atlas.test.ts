import { buildMockData } from '@/data/mock/mockTrips';
import type { Trip, TripStop } from '@/data/types';

import {
  clampView,
  countryPoint,
  globeDots,
  globePaths,
  hereNow,
  lifetimeStats,
  newestFirst,
  visitedCountries,
} from '../atlas';
import { passportStamps } from '../finishTrip';

const today = '2027-03-20';
const data = buildMockData(today);
const trip = (id: string) => data.trips.find((t) => t.id === id)!;
const stopsByTrip = new Map<string, TripStop[]>(
  data.trips.map((t) => [t.id, data.stops.filter((s) => s.tripId === t.id)]),
);
const lisbon = trip('trip-lisbon');
const alps = trip('trip-alps');
const finishedLisbon: Trip = { ...lisbon, status: 'finished', finishedAt: today };

describe('lifetimeStats', () => {
  it('counts only finished trips: countries, trips and days away', () => {
    // Mock data: only the Alps trip is finished (AT, CH, FR).
    const s = lifetimeStats(data.trips, stopsByTrip);
    expect(s.trips).toBe(1);
    expect(s.countries).toBe(3);
    expect(s.days).toBe(
      Math.round((Date.parse(alps.endDate!) - Date.parse(alps.startDate!)) / 86_400_000) + 1,
    );
  });

  it('counts a day once when two finished trips overlap', () => {
    const a: Trip = { ...finishedLisbon, id: 'a', startDate: '2026-05-01', endDate: '2026-05-05' };
    const b: Trip = { ...finishedLisbon, id: 'b', startDate: '2026-05-04', endDate: '2026-05-08' };
    const stops = new Map([
      ['a', stopsByTrip.get(lisbon.id)!],
      ['b', stopsByTrip.get(lisbon.id)!],
    ]);
    expect(lifetimeStats([a, b], stops)).toEqual({ countries: 1, trips: 2, days: 8 });
  });

  it('leaves out deleted and planned trips', () => {
    const gone: Trip = { ...alps, deletedAt: today };
    expect(lifetimeStats([gone, lisbon], stopsByTrip)).toEqual({ countries: 0, trips: 0, days: 0 });
  });
});

describe('visitedCountries', () => {
  it('lists each visited country with its trips, the most trips first', () => {
    const again: Trip = {
      ...alps,
      id: 'alps-again',
      endDate: '2027-01-10',
      startDate: '2027-01-05',
    };
    const stops = new Map(stopsByTrip).set(again.id, [
      { ...stopsByTrip.get(alps.id)![0]!, tripId: again.id },
    ]);
    const rows = visitedCountries([...data.trips, again, finishedLisbon], stops);
    expect(rows[0]).toEqual({ code: 'AT', trips: 2, lastDate: '2027-01-10' });
    expect(rows.map((r) => r.code).sort()).toEqual(['AT', 'CH', 'FR', 'PT']);
    expect(rows.find((r) => r.code === 'PT')?.trips).toBe(1);
  });
});

describe('hereNow', () => {
  it('is the country of today on a trip that is on now', () => {
    // On 2027-03-20 the mock Lisbon trip is happening.
    expect(hereNow(data.trips, stopsByTrip, today)).toBe('PT');
    expect(hereNow([alps], stopsByTrip, today)).toBeNull();
  });
});

describe('newestFirst', () => {
  it('puts the latest stamp first without changing the passport', () => {
    const stamps = passportStamps(data.trips, stopsByTrip);
    const copy = [...stamps];
    expect(newestFirst(stamps)).toEqual(copy.reverse());
    expect(stamps).toEqual(passportStamps(data.trips, stopsByTrip));
  });
});

describe('globe', () => {
  it('decodes the land dots once, with countries and tiny countries as single dots', () => {
    const dots = globeDots();
    expect(dots).toBe(globeDots());
    expect(dots.length).toBeGreaterThan(3000);
    expect(dots.some((d) => d.code === 'IT')).toBe(true);
    expect(dots.some((d) => d.code === 'MT')).toBe(true); // Malta, smaller than one grid cell
  });

  it('knows where countries are', () => {
    const it = countryPoint('IT')!;
    expect(it.lng).toBeGreaterThan(6);
    expect(it.lng).toBeLessThan(19);
    expect(countryPoint('ZZ')).toBeNull();
  });

  it('keeps the view inside the limits', () => {
    expect(clampView({ lng: 200, lat: 100 })).toEqual({ lng: -160, lat: 70 });
    expect(clampView({ lng: -190, lat: -90 })).toEqual({ lng: 170, lat: -70 });
  });

  it('draws visited countries and today separately, only on the front', () => {
    const europe = globePaths({ lng: 12, lat: 40 }, 320, new Set(['IT']), 'PT');
    expect(europe.visited).not.toBe('');
    expect(europe.here).not.toBe('');
    expect(europe.land.join('')).not.toBe('');
    // From the other side of the Earth (the Pacific) Italy and Portugal are hidden.
    const pacific = globePaths({ lng: -168, lat: -10 }, 320, new Set(['IT']), 'PT');
    expect(pacific.visited).toBe('');
    expect(pacific.here).toBe('');
    // Every dot stays inside the square.
    const nums = europe.land[2].match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums.every((n) => n >= 0 && n <= 320)).toBe(true);
  });
});
