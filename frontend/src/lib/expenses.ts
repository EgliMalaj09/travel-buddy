import { currencyForCountry } from '@/data/static/countries';
import type { Expense, ExpenseCategory, IsoDate, Trip, TripStop } from '@/data/types';

import { dayLabel, stopForDay, tripDays } from './places';
import { convertMinor, type RatesToEur } from './money';

/** Expenses (KAN-42): categories, defaults, grouping and totals. */

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  food: 'Food',
  transport: 'Transport',
  stay: 'Stay',
  activities: 'Activities',
  shopping: 'Shopping',
  other: 'Other',
};

/** Ionicons names, one per category. */
export const expenseCategoryIcons = {
  food: 'restaurant-outline',
  transport: 'bus-outline',
  stay: 'bed-outline',
  activities: 'ticket-outline',
  shopping: 'bag-handle-outline',
  other: 'wallet-outline',
} as const satisfies Record<ExpenseCategory, string>;

/** The order categories are offered in the form and listed in the totals. */
export const expenseCategoryOrder: ExpenseCategory[] = [
  'food',
  'transport',
  'stay',
  'activities',
  'shopping',
  'other',
];

function insideTrip(trip: Pick<Trip, 'startDate' | 'endDate'>, date: IsoDate): boolean {
  return !!trip.startDate && !!trip.endDate && date >= trip.startDate && date <= trip.endDate;
}

/**
 * The currency a new expense starts with (D5): the local currency of the stop you are in that day.
 * Before or after the trip (a booking made at home), the home currency.
 */
export function defaultCurrency(
  trip: Pick<Trip, 'startDate' | 'endDate'>,
  stops: TripStop[],
  date: IsoDate,
  homeCurrency: string,
): string {
  if (!insideTrip(trip, date)) return homeCurrency;
  return currencyForCountry(stopForDay(trip, stops, date)?.countryCode) ?? homeCurrency;
}

/** Quick currency choices: the trip's local currencies, then home, then others used on this trip. */
export function currencyChoices(stops: TripStop[], homeCurrency: string, used: string[]): string[] {
  const local = stops
    .filter((s) => !s.deletedAt)
    .map((s) => currencyForCountry(s.countryCode))
    .filter((c): c is string => !!c);
  return [...new Set([...local, homeCurrency, ...used].filter(Boolean))];
}

/**
 * The days offered in the form: today first when it is not a trip day (bookings before the trip),
 * then every trip day, and the expense's own day if it is neither.
 */
export function expenseDays(
  trip: Pick<Trip, 'startDate' | 'endDate'>,
  today: IsoDate,
  current: IsoDate | null,
): IsoDate[] {
  const days = tripDays(trip);
  const extra = [today, current].filter((d): d is IsoDate => !!d && !days.includes(d));
  return [...new Set(extra)].sort().concat(days);
}

/** "Today", "Day 2 · Tue 13 Apr" or "Tue 13 Apr". */
export function expenseDayLabel(
  trip: Pick<Trip, 'startDate' | 'endDate'>,
  date: IsoDate,
  today: IsoDate,
): string {
  if (date === today) return insideTrip(trip, date) ? `Today · ${dayLabel(trip, date)}` : 'Today';
  return dayLabel(trip, date);
}

/**
 * When it was paid: now for today, the time it already had when the day did not change,
 * else midday of that day on this phone (so the local day stays the same in every time zone view).
 */
export function spentAtFor(day: IsoDate, today: IsoDate, now: Date, kept?: Expense | null): string {
  if (kept && kept.fxRateDate === day) return kept.spentAt;
  if (day === today) return now.toISOString();
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0).toISOString();
}

/** Rates by day, as the phone keeps them. */
export type RatesByDay = Readonly<Record<IsoDate, { rates: RatesToEur } | undefined>>;

/** The expense in the home currency, or null while that day's rate is not on the phone yet. */
export function homeAmount(
  expense: Expense,
  homeCurrency: string,
  rates: RatesByDay,
): number | null {
  return convertMinor(
    expense.amountMinor,
    expense.currency,
    homeCurrency,
    rates[expense.fxRateDate]?.rates,
  );
}

export interface ExpenseSummary {
  /** Sum of every expense that could be converted, in home minor units. */
  totalHome: number;
  /** Expenses still "converting…" (no rate yet, e.g. added offline). */
  pending: number;
  count: number;
  /** Home amount per category, biggest first; only categories that have expenses. */
  byCategory: { category: ExpenseCategory; homeMinor: number }[];
  /** What was paid in each currency, biggest count first. */
  byCurrency: { currency: string; minor: number }[];
}

export function summarizeExpenses(
  expenses: Expense[],
  homeCurrency: string,
  rates: RatesByDay,
): ExpenseSummary {
  const categories = new Map<ExpenseCategory, number>();
  const currencies = new Map<string, { minor: number; count: number }>();
  let totalHome = 0;
  let pending = 0;
  for (const e of expenses) {
    if (e.deletedAt) continue;
    const c = currencies.get(e.currency) ?? { minor: 0, count: 0 };
    currencies.set(e.currency, { minor: c.minor + e.amountMinor, count: c.count + 1 });
    const home = homeAmount(e, homeCurrency, rates);
    if (home === null) {
      pending += 1;
      continue;
    }
    totalHome += home;
    categories.set(e.category, (categories.get(e.category) ?? 0) + home);
  }
  return {
    totalHome,
    pending,
    count: expenses.filter((e) => !e.deletedAt).length,
    byCategory: expenseCategoryOrder
      .filter((c) => categories.has(c))
      .map((category) => ({ category, homeMinor: categories.get(category)! }))
      .sort((a, b) => b.homeMinor - a.homeMinor),
    byCurrency: [...currencies.entries()]
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([currency, { minor }]) => ({ currency, minor })),
  };
}

export interface ExpenseDay {
  date: IsoDate;
  label: string;
  expenses: Expense[];
  /** Home total of the day's converted expenses. */
  totalHome: number;
}

/** The list on the Expenses tab: one group per day, newest day first. */
export function groupExpensesByDay(
  trip: Pick<Trip, 'startDate' | 'endDate'>,
  expenses: Expense[],
  homeCurrency: string,
  rates: RatesByDay,
  today: IsoDate,
): ExpenseDay[] {
  const days = new Map<IsoDate, Expense[]>();
  for (const e of expenses) {
    if (e.deletedAt) continue;
    days.set(e.fxRateDate, [...(days.get(e.fxRateDate) ?? []), e]);
  }
  return [...days.keys()]
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((date) => {
      const list = days.get(date)!;
      return {
        date,
        label: expenseDayLabel(trip, date, today),
        expenses: list,
        totalHome: list.reduce((sum, e) => sum + (homeAmount(e, homeCurrency, rates) ?? 0), 0),
      };
    });
}

/** The days and currencies whose rates the phone needs for these expenses. */
export function ratesNeeded(
  expenses: Expense[],
  homeCurrency: string,
): { dates: IsoDate[]; currencies: string[] } {
  const foreign = expenses.filter((e) => !e.deletedAt && e.currency !== homeCurrency);
  if (!foreign.length) return { dates: [], currencies: [] };
  return {
    dates: [...new Set(foreign.map((e) => e.fxRateDate))].sort(),
    currencies: [...new Set([homeCurrency, ...foreign.map((e) => e.currency)])].sort(),
  };
}
