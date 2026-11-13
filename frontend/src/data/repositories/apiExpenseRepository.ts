import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { newId } from '@/lib/ids';

import { notifyDataChanged } from '../changes';
import type { Expense } from '../types';
import { createHttpTripApi, type SyncChange, type TripApi } from './apiTripRepository';
import {
  checkExpense,
  expenseColumns,
  newExpenseColumns,
  sortExpenses,
  type ExpenseRepository,
} from './expenseRepository';

type Schemas = components['schemas'];

/** The backend calls this repository needs. Tests pass a fake. */
export interface ExpenseApi {
  /** GET /expenses?tripId= ; null when the trip is not found. */
  list(tripId: string): Promise<Schemas['ExpenseDto'][] | null>;
  upload: TripApi['upload'];
}

const OFFLINE = "Can't reach the server. Check your connection and try again.";

export function createHttpExpenseApi(): ExpenseApi {
  return {
    async list(tripId) {
      let result;
      try {
        result = await api.GET('/expenses', { params: { query: { tripId } } });
      } catch {
        throw new Error(OFFLINE);
      }
      if (result.response.status === 404) return null;
      if (result.response.status === 401) throw new Error('Please log in again.');
      if (!result.data)
        throw new Error('The server could not load the expenses. Please try again.');
      return result.data.expenses;
    },
    upload: createHttpTripApi().upload,
  };
}

export function toExpense(e: Schemas['ExpenseDto']): Expense {
  return {
    ...e,
    scope: e.scope as Expense['scope'],
    category: e.category as Expense['category'],
    amountMinor: Number(e.amountMinor),
    version: Number(e.version),
  };
}

/**
 * Expenses on the server (web preview, or EXPO_PUBLIC_DATA_MODE=api): reads GET /expenses, writes
 * POST /sync/upload in the same change format the phone's offline queue uses. Needs the connection.
 */
export function createApiExpenseRepository(
  expenseApi: ExpenseApi = createHttpExpenseApi(),
): ExpenseRepository {
  /** The expenses of the trips loaded so far, by trip. */
  const byTrip = new Map<string, Expense[]>();

  async function load(tripId: string): Promise<Expense[]> {
    const expenses = sortExpenses(((await expenseApi.list(tripId)) ?? []).map(toExpense));
    byTrip.set(tripId, expenses);
    return expenses;
  }

  const tripOf = (id: string) =>
    [...byTrip.values()].flat().find((e) => e.id === id)?.tripId ?? null;

  async function send(changes: SyncChange[], tripId: string | null) {
    try {
      const results = await expenseApi.upload(changes);
      const rejected = results.find((r) => r.status !== 'ok');
      if (rejected) {
        const message = Object.values(rejected.problems ?? {})[0]?.[0];
        throw new Error(message ?? 'The server could not save this.');
      }
    } finally {
      if (tripId) byTrip.delete(tripId);
      notifyDataChanged();
    }
  }

  async function reload(id: string, tripId: string | null): Promise<Expense> {
    const expense = tripId ? (await load(tripId)).find((e) => e.id === id) : null;
    if (!expense) throw new Error('The expense was not saved. Please try again.');
    return expense;
  }

  return {
    reset() {
      byTrip.clear();
    },
    listExpenses: load,
    async createExpense(tripId, input) {
      checkExpense(input);
      const id = newId();
      await send(
        [
          {
            op: 'PUT',
            type: 'expenses',
            id,
            data: { ...newExpenseColumns(tripId), ...expenseColumns(input) },
          },
        ],
        tripId,
      );
      return reload(id, tripId);
    },
    async updateExpense(id, input) {
      checkExpense(input);
      const tripId = tripOf(id);
      await send([{ op: 'PATCH', type: 'expenses', id, data: expenseColumns(input) }], tripId);
      return reload(id, tripId);
    },
    async deleteExpense(id) {
      await send([{ op: 'DELETE', type: 'expenses', id }], tripOf(id));
    },
  };
}
