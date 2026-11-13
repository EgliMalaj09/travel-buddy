import { dataMode, repositories, useAsync, useDataVersion } from '@/data';
import type { Expense, Trip, TripStop } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { ratesNeeded, type RatesByDay } from '@/lib/expenses';
import { getFxRates } from '@/services/fxRates';

export interface ExpensesData {
  trip: Trip;
  stops: TripStop[];
  expenses: Expense[];
  rates: RatesByDay;
  homeCurrency: string;
}

/**
 * A trip's expenses with the daily rates needed to show them in the home currency (D5). Each
 * person sees their own home currency (from their profile), not the trip's. Rates come from what
 * the phone kept, else from the server; offline the missing ones show "converting…".
 */
export async function loadExpenses(
  tripId: string,
  homeCurrency: string,
): Promise<ExpensesData | null> {
  const trip = await repositories.trips.getTrip(tripId);
  if (!trip) return null;
  const [stops, expenses] = await Promise.all([
    repositories.trips.listStops(tripId),
    repositories.expenses.listExpenses(tripId),
  ]);
  const { dates, currencies } = ratesNeeded(expenses, homeCurrency);
  // Mock mode has no server to ask.
  const rates = dates.length && dataMode !== 'mock' ? await getFxRates(dates, currencies) : {};
  return { trip, stops, expenses, rates, homeCurrency };
}

/** The logged-in user's home currency (EUR until the profile is loaded). */
export function useHomeCurrency(): string {
  const { user } = useAuth();
  return user?.profile?.homeCurrency || 'EUR';
}

export function useExpenses(tripId: string) {
  const version = useDataVersion();
  const home = useHomeCurrency();
  return useAsync(() => loadExpenses(tripId, home), [tripId, home, version]);
}
