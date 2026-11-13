import { buildMockData } from '@/data/mock/mockTrips';
import type { Flight } from '@/data/types';

import {
  defaultReminderSettings,
  eveningTime,
  formatReminderTime,
  planReminders,
  reminderRoutes,
  zonedTimeToDate,
} from '../reminders';

const today = '2027-03-20';
const data = buildMockData(today);
// Rome & Florence starts 23 days later: 12 Apr 2027, first flight 09:40 from Tirana.
const rome = data.trips.find((t) => t.id === 'trip-rome-florence')!;
const romeFlights = data.flights.filter((f) => f.tripId === rome.id);
const flightsByTrip = new Map<string, Flight[]>([[rome.id, romeFlights]]);
const now = new Date(2027, 2, 20, 12, 0);
const local = (y: number, m: number, d: number, h: number, mi = 0) => new Date(y, m - 1, d, h, mi);

describe('planReminders', () => {
  const plan = planReminders({ trips: [rome], flightsByTrip, now });
  const byId = (id: string) => plan.find((r) => r.id === id);

  it('skips reminders that are already past (the 30-day one)', () => {
    expect(byId(`getReady:${rome.id}:30`)).toBeUndefined();
  });

  it('reminds 7 days before at 19:00', () => {
    expect(byId(`getReady:${rome.id}:7`)).toMatchObject({
      title: 'Rome & Florence in 7 days',
      at: local(2027, 4, 5, 19),
    });
  });

  it('puts the first flight, packing and last checks in one evening reminder', () => {
    expect(byId(`evening:${rome.id}`)).toEqual(
      expect.objectContaining({
        title: 'Rome & Florence tomorrow',
        body: 'Flight Wizz Air W6 4567 · TIA → FCO at 09:40. Check in now. Pack tonight. Last checks before you go.',
        at: local(2027, 4, 11, 19),
      }),
    );
    // No separate evening reminder for that flight.
    expect(byId('flightEve:trip-rome-florence-flight-0')).toBeUndefined();
  });

  it('reminds 3 hours before takeoff, in the airport time zone', () => {
    // 09:40 in Tirana (UTC+2 in April) = 07:40 UTC, minus 3 hours.
    expect(byId('flightSoon:trip-rome-florence-flight-0')?.at.toISOString()).toBe(
      '2027-04-12T04:40:00.000Z',
    );
  });

  it('reminds the evening before the return flight', () => {
    expect(byId('flightEve:trip-rome-florence-flight-1')).toMatchObject({
      title: 'Flight tomorrow at 18:20',
      at: local(2027, 4, 18, 19),
    });
  });

  it('is sorted by time', () => {
    const times = plan.map((r) => r.at.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('respects the switches', () => {
    expect(
      planReminders({
        trips: [rome],
        flightsByTrip,
        now,
        settings: { ...defaultReminderSettings, remindersEnabled: false },
      }),
    ).toEqual([]);
    const noFlights = planReminders({
      trips: [rome],
      flightsByTrip,
      now,
      settings: { ...defaultReminderSettings, remindFlight: false },
    });
    expect(noFlights.some((r) => r.kind.startsWith('flight'))).toBe(false);
    expect(noFlights.find((r) => r.kind === 'evening')?.body).toBe(
      'Pack tonight. Last checks before you go.',
    );
  });

  it('asks "How was <trip>?" the evening after the last day (Finish trip, KAN-47)', () => {
    const [y, m, d] = rome.endDate!.split('-').map(Number);
    expect(byId(`finish:${rome.id}`)).toMatchObject({
      kind: 'finish',
      title: 'How was Rome & Florence?',
      at: local(y!, m!, d! + 1, 19),
    });
    expect(reminderRoutes(rome.id, 'finish')).toEqual([
      `/trip/${rome.id}`,
      `/trip/finish/${rome.id}`,
    ]);
  });

  it('ignores trips without dates, finished or deleted', () => {
    const others = data.trips.filter((t) => t.id !== rome.id);
    // Only the trip happening now (Lisbon) still gets its "How was…?" question.
    expect(
      planReminders({ trips: others, flightsByTrip: new Map(), now }).map((r) => r.id),
    ).toEqual(['finish:trip-lisbon']);
    expect(
      planReminders({
        trips: [{ ...rome, deletedAt: '2027-03-01T00:00:00Z' }],
        flightsByTrip,
        now,
      }),
    ).toEqual([]);
  });
});

describe('eveningTime', () => {
  it('keeps 19:00 and moves a time inside quiet hours to their end', () => {
    expect(eveningTime(defaultReminderSettings)).toBe('19:00');
    expect(eveningTime({ ...defaultReminderSettings, reminderTime: '23:30' })).toBe('08:00');
    expect(eveningTime({ ...defaultReminderSettings, reminderTime: '06:00' })).toBe('08:00');
  });
});

describe('zonedTimeToDate', () => {
  it('handles winter and summer time', () => {
    expect(zonedTimeToDate('2027-01-10T09:00', 'Europe/Rome').toISOString()).toBe(
      '2027-01-10T08:00:00.000Z',
    );
    expect(zonedTimeToDate('2027-07-10T09:00', 'Europe/Rome').toISOString()).toBe(
      '2027-07-10T07:00:00.000Z',
    );
    expect(zonedTimeToDate('2027-07-10T09:00', 'America/New_York').toISOString()).toBe(
      '2027-07-10T13:00:00.000Z',
    );
  });

  it('uses the phone zone when the flight has none', () => {
    expect(zonedTimeToDate('2027-07-10T09:00', null)).toEqual(local(2027, 7, 10, 9));
  });
});

describe('formatReminderTime', () => {
  it('says today, tomorrow or the day', () => {
    expect(formatReminderTime(local(2027, 3, 20, 19), now)).toBe('Today 19:00');
    expect(formatReminderTime(local(2027, 3, 21, 6, 40), now)).toBe('Tomorrow 06:40');
    expect(formatReminderTime(local(2027, 4, 5, 19), now)).toBe('Mon 5 Apr · 19:00');
  });
});
