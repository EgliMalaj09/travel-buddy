import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { rowToExpense } from '../../local/rows';
import { expenseTables, serverColumns, tripTables } from '../../local/tables';
import { toSyncChange } from '../../local/uploadChanges';
import type { SyncChange, SyncResult } from '../apiTripRepository';
import { createApiExpenseRepository, type ExpenseApi } from '../apiExpenseRepository';
import {
  createMockExpenseRepository,
  expenseInputProblem,
  type ExpenseInput,
  type ExpenseRepository,
} from '../expenseRepository';
import { createLocalExpenseRepository } from '../localExpenseRepository';
import { createLocalTripRepository, type LocalDb } from '../localTripRepository';

function sqliteDb(): { db: LocalDb; sql: DatabaseSync } {
  const sql = new DatabaseSync(':memory:');
  for (const [name, columns] of Object.entries({ ...tripTables, ...expenseTables })) {
    const cols = Object.entries(columns).map(([c, type]) => `"${c}" ${type}`);
    sql.exec(`CREATE TABLE ${name} (id TEXT PRIMARY KEY, ${cols.join(', ')})`);
  }
  const run = (q: string, p: unknown[] = []) => sql.prepare(q).run(...(p as SQLInputValue[]));
  const all = async <T>(q: string, p: unknown[] = []) =>
    sql.prepare(q).all(...(p as SQLInputValue[])) as T[];
  const db: LocalDb = {
    getAll: all,
    async writeTransaction(work) {
      sql.exec('BEGIN');
      try {
        const result = await work({ execute: async (q, p) => run(q, p), getAll: all });
        sql.exec('COMMIT');
        return result;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { db, sql };
}

const dinner: ExpenseInput = {
  title: ' Dinner ',
  category: 'food',
  amountMinor: 20000,
  currency: 'MAD',
  spentAt: '2027-04-12T19:00:00.000Z',
  fxRateDate: '2027-04-12',
  note: '  tip included ',
};

describe('expense input checks (same as the server)', () => {
  it('needs a name, a positive whole amount, a currency and a day', () => {
    expect(expenseInputProblem(dinner)).toBeNull();
    expect(expenseInputProblem({ ...dinner, title: ' ' })).toMatch(/name/);
    expect(expenseInputProblem({ ...dinner, title: 'a'.repeat(81) })).toMatch(/80/);
    expect(expenseInputProblem({ ...dinner, amountMinor: 0 })).toMatch(/amount/);
    expect(expenseInputProblem({ ...dinner, amountMinor: 1.5 })).toMatch(/amount/);
    expect(expenseInputProblem({ ...dinner, amountMinor: 1e13 })).toMatch(/large/);
    expect(expenseInputProblem({ ...dinner, currency: 'mad' })).toMatch(/currency/);
    expect(expenseInputProblem({ ...dinner, fxRateDate: '' })).toMatch(/day/);
    expect(expenseInputProblem({ ...dinner, note: 'a'.repeat(2001) })).toMatch(/2000/);
  });
});

function behaves(name: string, make: () => ExpenseRepository) {
  describe(`${name} expense repository`, () => {
    it('adds, lists newest first, edits and deletes', async () => {
      const repo = make();
      const first = await repo.createExpense('trip-1', dinner, 'user-1');
      expect(first).toMatchObject({
        title: 'Dinner',
        note: 'tip included',
        amountMinor: 20000,
        currency: 'MAD',
        fxRateDate: '2027-04-12',
        scope: 'shared',
      });
      const later = await repo.createExpense(
        'trip-1',
        { ...dinner, title: 'Taxi', spentAt: '2027-04-13T08:00:00.000Z', fxRateDate: '2027-04-13' },
        'user-1',
      );
      await repo.createExpense('trip-2', dinner, 'user-1');
      expect((await repo.listExpenses('trip-1')).map((e) => e.id)).toEqual([later.id, first.id]);

      const edited = await repo.updateExpense(first.id, {
        ...dinner,
        amountMinor: 25050,
        note: null,
      });
      expect(edited).toMatchObject({ amountMinor: 25050, note: null });

      await repo.deleteExpense(later.id);
      expect((await repo.listExpenses('trip-1')).map((e) => e.id)).toEqual([first.id]);
    });

    it('refuses bad input before saving', async () => {
      const repo = make();
      await expect(
        repo.createExpense('trip-1', { ...dinner, amountMinor: 0 }, 'u'),
      ).rejects.toThrow(/amount/);
      expect(await repo.listExpenses('trip-1')).toEqual([]);
    });
  });
}

behaves('mock', () => createMockExpenseRepository());
behaves('local', () => createLocalExpenseRepository(sqliteDb().db));

function fakeExpenseApi(): ExpenseApi & { sent: SyncChange[] } {
  const rows = new Map<string, Record<string, unknown>>();
  const sent: SyncChange[] = [];
  return {
    sent,
    async list(tripId) {
      return [...rows.entries()]
        .filter(([, r]) => r.trip_id === tripId && !r.deleted_at)
        .map(([id, r]) => ({
          ...rowToExpense({ id, ...r, version: 1 }),
          createdAt: String(r.created_at),
        }));
    },
    async upload(changes): Promise<SyncResult[]> {
      for (const c of changes) {
        sent.push(c);
        if (c.op === 'DELETE') rows.set(c.id, { ...rows.get(c.id), deleted_at: 'now' });
        else
          rows.set(c.id, {
            created_at: new Date(Date.now() + rows.size).toISOString(),
            created_by_user_id: 'user-1',
            ...rows.get(c.id),
            ...c.data,
          });
      }
      return changes.map((c) => ({ id: c.id, type: c.type, status: 'ok', problems: null }));
    },
  };
}

behaves('api', () => createApiExpenseRepository(fakeExpenseApi()));

describe('expenses in the offline queue', () => {
  it('sends a new expense without the server-only columns', async () => {
    const { db, sql } = sqliteDb();
    const e = await createLocalExpenseRepository(db).createExpense('trip-1', dinner, 'user-1');
    const row = sql.prepare('SELECT * FROM expenses WHERE id = ?').get(e.id) as Record<
      string,
      unknown
    >;
    const change = toSyncChange({ op: 'PUT', table: 'expenses', id: e.id, opData: row })!;
    expect(change.type).toBe('expenses');
    for (const column of serverColumns) expect(change.data).not.toHaveProperty(column);
    expect(change.data).toMatchObject({
      trip_id: 'trip-1',
      amount_minor: 20000,
      currency: 'MAD',
      fx_rate_date: '2027-04-12',
      scope: 'shared',
    });
  });

  it('the api repository sends only the changed columns on edit', async () => {
    const api = fakeExpenseApi();
    const repo = createApiExpenseRepository(api);
    const e = await repo.createExpense('trip-1', dinner, 'user-1');
    await repo.listExpenses('trip-1');
    await repo.updateExpense(e.id, { ...dinner, amountMinor: 100 });
    const patch = api.sent.find((c) => c.op === 'PATCH')!;
    expect(patch.data).not.toHaveProperty('trip_id');
    expect(patch.data).toMatchObject({ amount_minor: 100 });
  });

  it('deleting a trip on the phone removes its expenses too', async () => {
    const { db } = sqliteDb();
    const trips = createLocalTripRepository(db);
    const expenses = createLocalExpenseRepository(db);
    const trip = await trips.createTrip(
      {
        name: 'Marrakech',
        startDate: null,
        endDate: null,
        activities: [],
        stops: [
          {
            cityName: 'Marrakech',
            countryCode: 'MA',
            lat: null,
            lng: null,
            geoProviderId: null,
            nights: 2,
          },
        ],
        flights: [],
      },
      { ownerId: 'user-1', passportCountry: 'AL', homeCurrency: 'ALL' },
    );
    await expenses.createExpense(trip.id, dinner, 'user-1');
    await trips.deleteTrip(trip.id);
    expect(await expenses.listExpenses(trip.id)).toEqual([]);
  });
});
