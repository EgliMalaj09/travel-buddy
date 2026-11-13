import type { Expense, TripStop } from '@/data/types';

import {
  currencyChoices,
  defaultCurrency,
  expenseDayLabel,
  expenseDays,
  groupExpensesByDay,
  homeAmount,
  ratesNeeded,
  spentAtFor,
  summarizeExpenses,
} from '../expenses';

const trip = { startDate: '2027-04-12', endDate: '2027-04-16' };
const sync = { createdAt: '2027-04-01T00:00:00Z', updatedAt: 'x', deletedAt: null, version: 1 };
const stop = (id: string, countryCode: string, order: number, nights: number): TripStop => ({
  id,
  tripId: 't1',
  order,
  countryCode,
  cityName: id,
  lat: null,
  lng: null,
  geoProviderId: null,
  nights,
  ...sync,
});
// 2 nights in Marrakech (MAD), then 2 in Lisbon (EUR).
const stops = [stop('Marrakech', 'MA', 0, 2), stop('Lisbon', 'PT', 1, 2)];

let n = 0;
const expense = (over: Partial<Expense>): Expense => ({
  id: `e${++n}`,
  tripId: 't1',
  createdByUserId: 'u1',
  paidByUserId: 'u1',
  scope: 'shared',
  ownerUserId: null,
  title: 'Dinner',
  category: 'food',
  amountMinor: 20000,
  currency: 'MAD',
  spentAt: '2027-04-12T19:00:00Z',
  fxRateDate: '2027-04-12',
  placeId: null,
  note: null,
  ...sync,
  ...over,
});
const rates = { '2027-04-12': { rates: { MAD: 10, ALL: 100 } } };

describe('expense defaults', () => {
  it('starts with the local money of the stop you are in, home money outside the trip', () => {
    expect(defaultCurrency(trip, stops, '2027-04-12', 'ALL')).toBe('MAD');
    expect(defaultCurrency(trip, stops, '2027-04-15', 'ALL')).toBe('EUR');
    expect(defaultCurrency(trip, stops, '2027-03-01', 'ALL')).toBe('ALL');
    expect(defaultCurrency(trip, [], '2027-04-12', 'ALL')).toBe('ALL');
  });

  it('offers the trip currencies, home and the ones used', () => {
    expect(currencyChoices(stops, 'ALL', ['USD', 'MAD'])).toEqual(['MAD', 'EUR', 'ALL', 'USD']);
  });

  it('offers today before the trip days when today is not one of them', () => {
    expect(expenseDays(trip, '2027-03-01', null)).toEqual([
      '2027-03-01',
      '2027-04-12',
      '2027-04-13',
      '2027-04-14',
      '2027-04-15',
      '2027-04-16',
    ]);
    expect(expenseDays(trip, '2027-04-13', null)).toHaveLength(5);
    expect(expenseDays({ startDate: null, endDate: null }, '2027-03-01', '2027-02-01')).toEqual([
      '2027-02-01',
      '2027-03-01',
    ]);
    expect(expenseDayLabel(trip, '2027-04-13', '2027-04-13')).toBe('Today · Day 2 · Tue 13 Apr');
    expect(expenseDayLabel(trip, '2027-03-01', '2027-03-01')).toBe('Today');
  });

  it('keeps the time when the day is unchanged, now for today, midday otherwise', () => {
    const now = new Date('2027-04-13T08:30:00Z');
    const kept = expense({ spentAt: '2027-04-12T19:00:00Z', fxRateDate: '2027-04-12' });
    expect(spentAtFor('2027-04-12', '2027-04-13', now, kept)).toBe('2027-04-12T19:00:00Z');
    expect(spentAtFor('2027-04-13', '2027-04-13', now, kept)).toBe(now.toISOString());
    const midday = new Date(spentAtFor('2027-04-14', '2027-04-13', now));
    expect([midday.getFullYear(), midday.getMonth(), midday.getDate(), midday.getHours()]).toEqual([
      2027, 3, 14, 12,
    ]);
  });
});

describe('expense totals in the home currency', () => {
  const list = [
    expense({ amountMinor: 20000 }), // 200 MAD = 20 EUR = 2000 ALL
    expense({ category: 'transport', amountMinor: 5000, currency: 'ALL' }), // 50 ALL, no rate needed
    expense({ fxRateDate: '2027-04-13', spentAt: '2027-04-13T10:00:00Z' }), // no rate yet
  ];

  it('adds up what can be converted and counts the rest as converting', () => {
    expect(homeAmount(list[0]!, 'ALL', rates)).toBe(200000);
    const s = summarizeExpenses(list, 'ALL', rates);
    expect(s.totalHome).toBe(205000);
    expect(s.pending).toBe(1);
    expect(s.count).toBe(3);
    expect(s.byCategory).toEqual([
      { category: 'food', homeMinor: 200000 },
      { category: 'transport', homeMinor: 5000 },
    ]);
    expect(s.byCurrency).toEqual([
      { currency: 'MAD', minor: 40000 },
      { currency: 'ALL', minor: 5000 },
    ]);
  });

  it('groups by day, newest first, with the day total', () => {
    const days = groupExpensesByDay(trip, list, 'ALL', rates, '2027-04-13');
    expect(days.map((d) => [d.date, d.label, d.expenses.length, d.totalHome])).toEqual([
      ['2027-04-13', 'Today · Day 2 · Tue 13 Apr', 1, 0],
      ['2027-04-12', 'Day 1 · Mon 12 Apr', 2, 205000],
    ]);
  });

  it('asks rates only for days with money in another currency', () => {
    expect(ratesNeeded(list, 'ALL')).toEqual({
      dates: ['2027-04-12', '2027-04-13'],
      currencies: ['ALL', 'MAD'],
    });
    expect(ratesNeeded([list[1]!], 'ALL')).toEqual({ dates: [], currencies: [] });
  });
});
