import { newId } from '@/lib/ids';

import { notifyDataChanged } from '../changes';
import { rowToExpense } from '../local/rows';
import {
  checkExpense,
  expenseColumns,
  newExpenseColumns,
  sortExpenses,
  type ExpenseRepository,
} from './expenseRepository';
import { insert, update, type LocalDb } from './localTripRepository';

/**
 * Expenses saved on the phone first (KAN-42): works with no signal. PowerSync sends the writes to
 * the server (POST /sync/upload) and brings back changes made on other phones.
 */
export function createLocalExpenseRepository(
  db: LocalDb,
  now: () => string = () => new Date().toISOString(),
): ExpenseRepository {
  async function find(id: string) {
    const rows = await db.getAll('SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL', [
      id,
    ]);
    return rows[0] ? rowToExpense(rows[0]) : null;
  }

  return {
    async listExpenses(tripId) {
      const rows = await db.getAll(
        'SELECT * FROM expenses WHERE trip_id = ? AND deleted_at IS NULL',
        [tripId],
      );
      return sortExpenses(rows.map(rowToExpense));
    },
    async createExpense(tripId, input, userId) {
      checkExpense(input);
      const id = newId();
      const at = now();
      await db.writeTransaction((tx) =>
        insert(tx, 'expenses', {
          id,
          ...newExpenseColumns(tripId),
          ...expenseColumns(input),
          // Server-only, kept on the phone for reading until the server's row comes back.
          created_by_user_id: userId,
          paid_by_user_id: userId,
          owner_user_id: null,
          created_at: at,
          updated_at: at,
          deleted_at: null,
          version: 0,
        }),
      );
      notifyDataChanged();
      const expense = await find(id);
      if (!expense) throw new Error('The expense was not saved. Please try again.');
      return expense;
    },
    async updateExpense(id, input) {
      checkExpense(input);
      if (!(await find(id))) throw new Error('Expense not found.');
      await db.writeTransaction((tx) =>
        update(tx, 'expenses', id, { ...expenseColumns(input), updated_at: now() }),
      );
      notifyDataChanged();
      return (await find(id))!;
    },
    async deleteExpense(id) {
      await db.writeTransaction((tx) => tx.execute('DELETE FROM expenses WHERE id = ?', [id]));
      notifyDataChanged();
    },
  };
}
