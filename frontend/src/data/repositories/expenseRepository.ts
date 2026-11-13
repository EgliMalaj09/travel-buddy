import { newId } from '@/lib/ids';
import { AMOUNT_MINOR_MAX } from '@/lib/money';

import { notifyDataChanged } from '../changes';
import type { Expense, ExpenseCategory, IsoDate, IsoDateTime, SyncFields } from '../types';

/** An expense as the add/edit form sends it. */
export interface ExpenseInput {
  title: string;
  category: ExpenseCategory;
  /** Minor units in `currency` (1250 = 12.50 EUR). */
  amountMinor: number;
  currency: string;
  spentAt: IsoDateTime;
  /** The local day of `spentAt`: decides the exchange rate. */
  fxRateDate: IsoDate;
  note: string | null;
}

/**
 * Expenses of a trip (KAN-42). Screens never talk to the network or the database directly.
 * Implementations: local database (PowerSync, phones), API (web preview), mock (memory).
 */
export interface ExpenseRepository {
  /** The trip's expenses, newest first. */
  listExpenses(tripId: string): Promise<Expense[]>;
  createExpense(tripId: string, input: ExpenseInput, userId: string): Promise<Expense>;
  updateExpense(id: string, input: ExpenseInput): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  /** Forgets anything loaded so far (another user logged in). */
  reset?(): void;
}

export const EXPENSE_TITLE_MAX = 80;
export const EXPENSE_NOTE_MAX = 2000;

/** The same checks the backend makes (ExpensesService.Check). */
export function expenseInputProblem(input: ExpenseInput): string | null {
  if (!input.title.trim()) return 'The expense needs a name.';
  if (input.title.trim().length > EXPENSE_TITLE_MAX)
    return `The name can be up to ${EXPENSE_TITLE_MAX} characters.`;
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
    return 'Enter an amount more than 0.';
  if (input.amountMinor > AMOUNT_MINOR_MAX) return 'The amount is too large.';
  if (!/^[A-Z]{3}$/.test(input.currency)) return 'Choose a currency.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fxRateDate) || Number.isNaN(Date.parse(input.spentAt)))
    return 'Choose the day.';
  if ((input.note ?? '').length > EXPENSE_NOTE_MAX)
    return `The note can be up to ${EXPENSE_NOTE_MAX} characters.`;
  return null;
}

export function checkExpense(input: ExpenseInput): void {
  const problem = expenseInputProblem(input);
  if (problem) throw new Error(problem);
}

/** Sort used by every implementation: newest first. */
export function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    if (a.spentAt !== b.spentAt) return a.spentAt < b.spentAt ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** Columns the phone writes for an expense (snake_case, as on the server and in PowerSync). */
export function expenseColumns(input: ExpenseInput) {
  return {
    title: input.title.trim(),
    category: input.category,
    amount_minor: input.amountMinor,
    currency: input.currency,
    spent_at: input.spentAt,
    fx_rate_date: input.fxRateDate,
    note: input.note?.trim() ? input.note.trim() : null,
  };
}

/** Columns only set when an expense is created. Part 1 trips are solo: every expense is "shared". */
export function newExpenseColumns(tripId: string) {
  return { trip_id: tripId, scope: 'shared', place_id: null };
}

/** Expenses in memory (mock mode, and the web preview's fallback), gone after a reload. */
export function createMockExpenseRepository(
  data: { expenses: Expense[] } = { expenses: [] },
  now: () => string = () => new Date().toISOString(),
): ExpenseRepository {
  const live = () => data.expenses.filter((e) => !e.deletedAt);
  const find = (id: string) => live().find((e) => e.id === id) ?? null;
  const fields = (input: ExpenseInput) => ({
    title: input.title.trim(),
    category: input.category,
    amountMinor: input.amountMinor,
    currency: input.currency,
    spentAt: input.spentAt,
    fxRateDate: input.fxRateDate,
    note: input.note?.trim() ? input.note.trim() : null,
  });

  return {
    async listExpenses(tripId) {
      return sortExpenses(live().filter((e) => e.tripId === tripId));
    },
    async createExpense(tripId, input, userId) {
      checkExpense(input);
      const at = now();
      const sync: SyncFields = { createdAt: at, updatedAt: at, deletedAt: null, version: 1 };
      const expense: Expense = {
        id: newId(),
        tripId,
        createdByUserId: userId,
        paidByUserId: userId,
        scope: 'shared',
        ownerUserId: null,
        placeId: null,
        ...fields(input),
        ...sync,
      };
      data.expenses.push(expense);
      notifyDataChanged();
      return expense;
    },
    async updateExpense(id, input) {
      checkExpense(input);
      const old = find(id);
      if (!old) throw new Error('Expense not found.');
      const next = { ...old, ...fields(input), updatedAt: now(), version: old.version + 1 };
      data.expenses = data.expenses.map((e) => (e.id === id ? next : e));
      notifyDataChanged();
      return next;
    },
    async deleteExpense(id) {
      if (!find(id)) return;
      data.expenses = data.expenses.map((e) => (e.id === id ? { ...e, deletedAt: now() } : e));
      notifyDataChanged();
    },
  };
}
