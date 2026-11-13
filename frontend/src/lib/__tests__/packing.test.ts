import type { ChecklistItem, TripStop } from '@/data/types';

import { autoItemId, planChecklist } from '../checklist';
import { packingTitle, packingView } from '../packing';
import { packingSuggestions, tripNights, type PackingContext } from '../packingRules';
import {
  summarize,
  summaryLine,
  unknownWeather,
  weatherConditions,
  weatherRequests,
  type TripWeather,
  type WeatherDay,
} from '../weather';

const ctx = (over: Partial<PackingContext> = {}): PackingContext => ({
  trip: {
    startDate: '2027-04-12',
    endDate: '2027-04-16',
    activities: [],
    passportCountrySnapshot: 'AL',
  },
  stops: [{ countryCode: 'IT', nights: 4 }],
  flights: [],
  weather: unknownWeather,
  ...over,
});
const ids = (c: PackingContext) => packingSuggestions(c).map((s) => s.ruleId);
const day = (over: Partial<WeatherDay> = {}): WeatherDay => ({
  date: '2027-04-12',
  kind: 'forecast',
  minC: 12,
  maxC: 20,
  precipitationMm: 0,
  precipitationChance: 10,
  snowCm: 0,
  ...over,
});
const weatherOf = (days: WeatherDay[]): TripWeather => ({
  stops: [{ stopId: 's1', days }],
  fetchedAt: '2026-11-13T10:00:00.000Z',
  stale: false,
  attribution: 'Weather data by Open-Meteo.com',
  attributionUrl: 'https://open-meteo.com/',
});

describe('packing rules (KAN-28/30)', () => {
  it('a 4-night trip abroad: documents, clothes by the night, toiletries, tech; all "pack-" packing items', () => {
    const s = packingSuggestions(ctx());
    expect(s.every((x) => x.type === 'packing' && x.ruleId.startsWith('pack-'))).toBe(true);
    const by = (id: string) => s.find((x) => x.ruleId === `pack-${id}`);
    expect(by('passport-id')?.title).toBe('Passport or ID card');
    expect(by('underwear')?.quantity).toBe(5);
    expect(by('tops')?.quantity).toBe(4);
    expect(by('trousers')?.quantity).toBe(2);
    expect(by('boarding-passes')).toBeUndefined();
    expect(ids(ctx())).not.toContain('pack-umbrella');
    // Same trip, same list.
    expect(packingSuggestions(ctx())).toEqual(s);
  });

  it('caps clothes on long trips and counts at least one night', () => {
    const long = packingSuggestions(
      ctx({
        trip: { ...ctx().trip, endDate: '2027-05-12' },
        stops: [{ countryCode: 'IT', nights: 30 }],
      }),
    );
    expect(long.find((x) => x.ruleId === 'pack-socks')?.quantity).toBe(8);
    expect(long.find((x) => x.ruleId === 'pack-tops')?.quantity).toBe(7);
    expect(tripNights({ trip: { ...ctx().trip, startDate: null, endDate: null }, stops: [] })).toBe(
      0,
    );
    const dayTrip = packingSuggestions(
      ctx({ trip: { ...ctx().trip, startDate: null, endDate: null }, stops: [] }),
    );
    expect(dayTrip.find((x) => x.ruleId === 'pack-socks')?.quantity).toBe(2);
    expect(dayTrip.find((x) => x.ruleId === 'pack-passport-id')?.title).toBe('ID card');
  });

  it('flights add boarding passes and the liquids bag; power bank note for hand luggage', () => {
    const s = packingSuggestions(ctx({ flights: [{ id: 'f1' }] }));
    expect(s.map((x) => x.ruleId)).toEqual(
      expect.arrayContaining(['pack-boarding-passes', 'pack-liquids-bag']),
    );
    expect(s.find((x) => x.ruleId === 'pack-power-bank')?.notes).toMatch(/hand luggage/);
  });

  it('weather: cold, freezing, snow, rain and heat add their items', () => {
    const cold = { ...unknownWeather, known: true, cold: true, freezing: true, snow: true };
    expect(ids(ctx({ weather: cold }))).toEqual(
      expect.arrayContaining([
        'pack-warm-jacket',
        'pack-hat-gloves',
        'pack-thermals',
        'pack-winter-boots',
      ]),
    );
    const wetHot = { ...unknownWeather, known: true, rain: true, hot: true };
    const s = packingSuggestions(ctx({ weather: wetHot }));
    expect(s.map((x) => x.ruleId)).toEqual(
      expect.arrayContaining([
        'pack-rain-jacket',
        'pack-umbrella',
        'pack-sun-cream',
        'pack-shorts',
      ]),
    );
    expect(s.find((x) => x.ruleId === 'pack-sun-cream')?.reason).toBe('weather');
    // Weather flags are ignored while the weather is unknown.
    expect(ids(ctx({ weather: { ...wetHot, known: false } }))).not.toContain('pack-umbrella');
  });

  it('activities add their gear once, even when the weather wants the same thing', () => {
    const s = packingSuggestions(
      ctx({
        trip: { ...ctx().trip, activities: ['beach', 'hiking', 'skiing', 'business', 'road_trip'] },
        weather: { ...unknownWeather, known: true, hot: true, rain: true, freezing: true },
      }),
    );
    const list = s.map((x) => x.ruleId);
    expect(new Set(list).size).toBe(list.length);
    expect(list).toEqual(
      expect.arrayContaining([
        'pack-swimwear',
        'pack-hiking-boots',
        'pack-ski-wear',
        'pack-laptop',
        'pack-driving-licence',
      ]),
    );
  });

  it('plug adapter for the UK from Albania, none inside the euro plug area', () => {
    expect(ids(ctx({ stops: [{ countryCode: 'GB', nights: 3 }] }))).toContain('pack-plug-adapter');
    expect(ids(ctx())).not.toContain('pack-plug-adapter');
  });
});

describe('packing list view', () => {
  const item = (over: Partial<ChecklistItem>): ChecklistItem => ({
    id: 'x',
    tripId: 't1',
    type: 'packing',
    title: 'Umbrella',
    notes: null,
    category: 'other',
    done: false,
    doneAt: null,
    doneByUserId: null,
    dueDate: null,
    quantity: 1,
    reason: 'weather',
    source: 'auto',
    ruleId: 'pack-umbrella',
    sourceUrl: null,
    sourceCheckedAt: null,
    ownerUserId: null,
    sortOrder: 10,
    createdAt: 'x',
    updatedAt: 'x',
    deletedAt: null,
    version: 1,
    ...over,
  });

  it('groups packing items, counts packed, leaves out to-dos and deleted rows', () => {
    const v = packingView(
      [
        item({
          id: 'a',
          ruleId: 'pack-socks',
          title: 'Socks',
          category: 'clothes',
          reason: 'rule',
          done: true,
        }),
        item({ id: 'b', ruleId: 'pack-umbrella' }),
        item({ id: 'c', type: 'task', ruleId: 'etias', category: 'documents' }),
        item({ id: 'd', ruleId: 'pack-tops', category: 'clothes', deletedAt: 'x' }),
      ],
      [{ ruleId: 'pack-socks' }, { ruleId: 'pack-umbrella' }] as never,
      true,
    );
    expect(v.sections.map((s) => s.category)).toEqual(['clothes', 'other']);
    expect(v.packed).toBe(1);
    expect(v.total).toBe(2);
  });

  it('weather items the rules stop wanting show under "No longer needed" only when the weather is known', () => {
    const items = [item({ id: 'b' })];
    expect(packingView(items, [], true).noLongerNeeded.map((i) => i.id)).toEqual(['b']);
    expect(packingView(items, [], false).noLongerNeeded).toEqual([]);
    expect(packingView(items, [], false).total).toBe(1);
    // A packed or edited item always stays.
    expect(packingView([item({ id: 'b', done: true })], [], true).noLongerNeeded).toEqual([]);
    expect(packingView([item({ id: 'b', source: 'user' })], [], true).noLongerNeeded).toEqual([]);
  });

  it('a deleted auto item is not added again', () => {
    const s = packingSuggestions(ctx());
    const deleted = item({
      id: autoItemId('t1', 'pack-socks'),
      ruleId: 'pack-socks',
      deletedAt: 'x',
    });
    expect(planChecklist('t1', [deleted], s).add.map((a) => a.ruleId)).not.toContain('pack-socks');
    expect(planChecklist('t1', [], s).add.every((a) => a.type === 'packing')).toBe(true);
  });

  it('shows how many', () => {
    expect(packingTitle({ title: 'Socks', quantity: 5 })).toBe('Socks × 5');
    expect(packingTitle({ title: 'Hat', quantity: 1 })).toBe('Hat');
  });
});

describe('weather helpers', () => {
  const stop = (over: Partial<TripStop>): TripStop => ({
    id: 's1',
    tripId: 't1',
    order: 1,
    countryCode: 'IT',
    cityName: 'Rome',
    lat: 41.90278,
    lng: 12.49636,
    geoProviderId: null,
    nights: 3,
    createdAt: 'x',
    updatedAt: 'x',
    deletedAt: null,
    version: 1,
    ...over,
  });

  it('asks per stop with rounded positions, from today at the earliest, skipping stops without a position', () => {
    const r = weatherRequests(
      { startDate: '2027-04-12' },
      [
        stop({}),
        stop({ id: 's2', order: 2, lat: null, lng: null }),
        stop({ id: 's3', order: 3, nights: 2 }),
      ],
      '2027-04-13',
    );
    expect(r).toEqual([
      {
        stopId: 's1',
        lat: 41.9,
        lng: 12.5,
        from: '2027-04-13',
        to: '2027-04-15',
        span: '2027-04-12..2027-04-15',
      },
      {
        stopId: 's3',
        lat: 41.9,
        lng: 12.5,
        from: '2027-04-18',
        to: '2027-04-20',
        span: '2027-04-18..2027-04-20',
      },
    ]);
  });

  it('skips stops already over, too far ahead, or without trip dates; caps at 31 days', () => {
    expect(weatherRequests({ startDate: '2027-04-01' }, [stop({})], '2027-04-12')).toEqual([]);
    expect(weatherRequests({ startDate: '2029-01-01' }, [stop({})], '2027-04-12')).toEqual([]);
    expect(weatherRequests({ startDate: null }, [stop({})], '2027-04-12')).toEqual([]);
    const long = weatherRequests({ startDate: '2027-04-12' }, [stop({ nights: 60 })], '2027-04-12');
    expect(long[0]?.to).toBe('2027-05-12');
  });

  it('summarises a stop and the trip conditions', () => {
    const days = [
      day({ minC: 1, maxC: 8, precipitationChance: 70 }),
      day({
        date: '2027-04-13',
        kind: 'typical',
        minC: 3,
        maxC: 9,
        snowCm: 2,
        precipitationChance: 30,
      }),
    ];
    const s = summarize(days)!;
    expect(s).toMatchObject({ minC: 1, maxC: 9, rainyDays: 1, snowyDays: 1, kind: 'mixed' });
    expect(summaryLine(s)).toBe('1–9°C · snow on 1 day · rain likely on 1 day');
    expect(weatherConditions(weatherOf(days))).toEqual({
      known: true,
      cold: true,
      freezing: true,
      hot: false,
      rain: true,
      snow: true,
    });
    expect(summaryLine(summarize([day({})])!)).toBe('12–20°C · mostly dry');
    expect(weatherConditions(null)).toEqual(unknownWeather);
    expect(weatherConditions(weatherOf([day({ maxC: 31 })])).hot).toBe(true);
  });
});
