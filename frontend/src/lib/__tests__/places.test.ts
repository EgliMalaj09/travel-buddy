import { buildMockData } from '@/data/mock/mockTrips';
import type { Place } from '@/data/types';

import { addDays } from '../dates';
import {
  dayLabel,
  groupPlacesByDay,
  locationForDay,
  placesOn,
  stopForDay,
  tripDays,
} from '../places';
import { todayPlan } from '../today';

const data = buildMockData('2027-03-20');
const rome = data.trips.find((t) => t.id === 'trip-rome-florence')!;
const stops = data.stops.filter((s) => s.tripId === rome.id);
const day = (n: number) => addDays(rome.startDate!, n);

let seq = 0;
function place(changes: Partial<Place>): Place {
  seq += 1;
  return {
    id: `place-${seq}`,
    tripId: rome.id,
    createdByUserId: 'user-1',
    ownerUserId: null,
    scope: 'shared',
    status: 'planned',
    title: `Place ${seq}`,
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
    createdAt: `2027-03-20T10:00:${String(seq).padStart(2, '0')}Z`,
    updatedAt: '2027-03-20T10:00:00Z',
    deletedAt: null,
    version: 1,
    ...changes,
  };
}

describe('trip days', () => {
  it('lists every day, first to last; none for a Someday trip', () => {
    expect(tripDays(rome)).toHaveLength(8);
    expect(tripDays(rome)[0]).toBe(rome.startDate);
    expect(tripDays(rome)[7]).toBe(rome.endDate);
    expect(tripDays({ startDate: null, endDate: null })).toEqual([]);
  });

  it('labels days inside the trip with their number', () => {
    expect(dayLabel(rome, day(1))).toMatch(/^Day 2 · /);
    expect(dayLabel(rome, day(20))).not.toMatch(/^Day/);
  });
});

describe('where a place is (city of that day)', () => {
  it('uses the stop of that day; the last day belongs to the last stop', () => {
    expect(stopForDay(rome, stops, day(0))?.cityName).toBe('Rome');
    expect(stopForDay(rome, stops, day(3))?.cityName).toBe('Rome');
    // Travel day: the night is in Florence.
    expect(stopForDay(rome, stops, day(4))?.cityName).toBe('Florence');
    expect(stopForDay(rome, stops, day(7))?.cityName).toBe('Florence');
  });

  it('"Any day" and Someday trips use the first stop', () => {
    expect(stopForDay(rome, stops, null)?.cityName).toBe('Rome');
    expect(stopForDay({ startDate: null, endDate: null }, stops, day(5))?.cityName).toBe('Rome');
    expect(stopForDay(rome, [], day(1))).toBeNull();
  });

  it('copies country, city and position of the stop', () => {
    expect(locationForDay(rome, stops, day(5))).toEqual({
      countryCode: 'IT',
      cityName: 'Florence',
      lat: 43.7696,
      lng: 11.2558,
    });
  });
});

describe('grouping by day', () => {
  it('groups in date order with "Any day" last, deleted ones left out', () => {
    const groups = groupPlacesByDay(rome, [
      place({ title: 'Gelato' }),
      place({ title: 'Uffizi', plannedDate: day(5) }),
      place({ title: 'Colosseum', plannedDate: day(1) }),
      place({ title: 'Gone', plannedDate: day(1), deletedAt: '2027-03-21T00:00:00Z' }),
      place({ title: 'Forum', plannedDate: day(1) }),
    ]);
    expect(groups.map((g) => [g.date, g.places.map((p) => p.title)])).toEqual([
      [day(1), ['Colosseum', 'Forum']],
      [day(5), ['Uffizi']],
      [null, ['Gelato']],
    ]);
    expect(groups[2]!.label).toBe('Any day');
  });

  it('places of a day put the visited ones last', () => {
    const list = [
      place({ title: 'Seen', plannedDate: day(2), status: 'visited' }),
      place({ title: 'To see', plannedDate: day(2) }),
      place({ title: 'Other day', plannedDate: day(3) }),
    ];
    expect(placesOn(list, day(2)).map((p) => p.title)).toEqual(['To see', 'Seen']);
  });
});

describe('Today card with places', () => {
  it("shows today's planned places before tonight's city", () => {
    const items = todayPlan(rome, stops, [], day(2), [
      place({ id: 'p-a', title: 'Colosseum', plannedDate: day(2) }),
      place({
        id: 'p-b',
        title: 'Trevi',
        plannedDate: day(2),
        status: 'visited',
        category: 'other',
      }),
      place({ title: 'Tomorrow', plannedDate: day(3) }),
      place({ title: 'Any day' }),
    ]);
    expect(items).toEqual([
      {
        key: 'place-p-a',
        icon: 'camera-outline',
        text: 'Colosseum',
        detail: 'Sight',
        placeId: 'p-a',
      },
      {
        key: 'place-p-b',
        icon: 'checkmark-circle',
        text: 'Trevi',
        detail: 'Been there',
        placeId: 'p-b',
      },
      { key: 'tonight', icon: 'bed-outline', text: 'Tonight in Rome' },
    ]);
  });
});
