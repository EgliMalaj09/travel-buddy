import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { autoItemId, planChecklist } from '@/lib/checklist';
import { checklistSuggestions } from '@/lib/checklistRules';
import { packingSuggestions } from '@/lib/packingRules';
import { unknownWeather } from '@/lib/weather';

import { syncedTables } from '../../local/tables';
import { toSyncChange } from '../../local/uploadChanges';
import {
  createLocalChecklistRepository,
  createMemoryChecklistRepository,
  type ChecklistRepository,
} from '../checklistRepository';
import type { LocalDb } from '../localTripRepository';

function sqliteDb(): { db: LocalDb; sql: DatabaseSync } {
  const sql = new DatabaseSync(':memory:');
  for (const [name, columns] of Object.entries(syncedTables)) {
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
  sql.exec("INSERT INTO trips (id, name) VALUES ('t1', 'Rome')");
  return { db, sql };
}

const suggestions = checklistSuggestions({
  trip: {
    startDate: '2027-04-12',
    endDate: '2027-04-19',
    activities: [],
    passportCountrySnapshot: 'AL',
    homeCurrencySnapshot: 'ALL',
  },
  stops: [{ countryCode: 'IT', cityName: 'Rome', nights: 3 }],
  flights: [],
});

const kinds: [string, () => { repo: ChecklistRepository; sql?: DatabaseSync }][] = [
  [
    'local database',
    () => {
      const { db, sql } = sqliteDb();
      return { repo: createLocalChecklistRepository(db, () => '2026-11-12T10:00:00.000Z'), sql };
    },
  ],
  ['memory', () => ({ repo: createMemoryChecklistRepository(() => '2026-11-12T10:00:00.000Z') })],
];

describe.each(kinds)('checklist repository (%s)', (_name, make) => {
  it('adds the rule items once, then the user ticks, edits, adds and deletes', async () => {
    const { repo, sql } = make();
    await repo.applyPlan('t1', planChecklist('t1', [], suggestions), 'v1');
    await repo.applyPlan('t1', planChecklist('t1', [], suggestions), 'v1'); // a second phone: no copies
    let items = await repo.listItems('t1');
    expect(items).toHaveLength(suggestions.length);
    expect(items.every((i) => i.source === 'auto' && i.type === 'task' && !i.done)).toBe(true);

    const etias = autoItemId('t1', 'etias');
    await repo.setDone(etias, true);
    await repo.editItem(autoItemId('t1', 'medicines'), {
      title: ' My pills ',
      notes: ' ',
      category: 'health',
    });
    const mine = await repo.addItem('t1', {
      title: 'Buy sunscreen',
      notes: null,
      category: 'other',
    });
    await repo.deleteItems([autoItemId('t1', 'ees')]);

    items = await repo.listItems('t1');
    const get = (id: string) => items.find((i) => i.id === id)!;
    expect(get(etias).done).toBe(true);
    expect(get(etias).doneAt).toBe('2026-11-12T10:00:00.000Z');
    expect(get(autoItemId('t1', 'medicines'))).toMatchObject({
      title: 'My pills',
      notes: null,
      source: 'user',
    });
    expect(mine).toMatchObject({ source: 'user', reason: 'user', ruleId: null });
    expect(mine.sortOrder).toBeGreaterThan(Math.max(...suggestions.map((s) => s.sortOrder)));
    // Soft deleted: still there, so the rules know not to add it again.
    expect(get(autoItemId('t1', 'ees')).deletedAt).not.toBeNull();
    expect(planChecklist('t1', items, suggestions).add).toEqual([]);

    if (sql) {
      const trip = sql
        .prepare("SELECT checklist_rules_version FROM trips WHERE id = 't1'")
        .get() as {
        checklist_rules_version: string;
      };
      expect(trip.checklist_rules_version).toBe('v1');
    }
  });

  it('packing items: rule items with how many, own items, quantity edits, trip version untouched', async () => {
    const { repo, sql } = make();
    const packing = packingSuggestions({
      trip: {
        startDate: '2027-04-12',
        endDate: '2027-04-15',
        activities: [],
        passportCountrySnapshot: 'AL',
      },
      stops: [{ countryCode: 'IT', nights: 3 }],
      flights: [],
      weather: unknownWeather,
    });
    await repo.applyPlan('t1', planChecklist('t1', [], packing));
    let items = await repo.listItems('t1');
    const socks = items.find((i) => i.id === autoItemId('t1', 'pack-socks'))!;
    expect(socks).toMatchObject({ type: 'packing', category: 'clothes', quantity: 4 });

    // The trip gets longer: an untouched item follows; an edited one keeps the user's number.
    const longer = packingSuggestions({
      trip: {
        startDate: '2027-04-12',
        endDate: '2027-04-19',
        activities: [],
        passportCountrySnapshot: 'AL',
      },
      stops: [{ countryCode: 'IT', nights: 7 }],
      flights: [],
      weather: unknownWeather,
    });
    await repo.editItem(autoItemId('t1', 'pack-tops'), {
      title: 'T-shirts',
      notes: null,
      category: 'clothes',
      quantity: 2,
    });
    items = await repo.listItems('t1');
    await repo.applyPlan('t1', planChecklist('t1', items, longer));
    items = await repo.listItems('t1');
    expect(items.find((i) => i.id === autoItemId('t1', 'pack-socks'))!.quantity).toBe(8);
    expect(items.find((i) => i.id === autoItemId('t1', 'pack-tops'))).toMatchObject({
      quantity: 2,
      source: 'user',
    });

    const own = await repo.addItem(
      't1',
      { title: 'Camera', notes: null, category: 'tech', quantity: 1 },
      'packing',
    );
    expect(own).toMatchObject({ type: 'packing', quantity: 1, source: 'user' });
    await expect(
      repo.addItem(
        't1',
        { title: 'Socks', notes: null, category: 'clothes', quantity: 0 },
        'packing',
      ),
    ).rejects.toThrow('How many: 1 to 99.');

    if (sql) {
      const trip = sql
        .prepare("SELECT checklist_rules_version AS v FROM trips WHERE id = 't1'")
        .get() as {
        v: string | null;
      };
      expect(trip.v).toBeNull();
    }
  });

  it('refuses an item without a name', async () => {
    const { repo } = make();
    await expect(
      repo.addItem('t1', { title: '  ', notes: null, category: 'other' }),
    ).rejects.toThrow('Give the item a name.');
  });
});

describe('uploading checklist changes', () => {
  it('a soft delete on the phone is sent as a DELETE; server-only columns are left out', () => {
    expect(
      toSyncChange({
        op: 'PATCH',
        table: 'checklist_items',
        id: 'c1',
        opData: { deleted_at: 'x', updated_at: 'x' },
      }),
    ).toEqual({ op: 'DELETE', type: 'checklist_items', id: 'c1' });
    expect(
      toSyncChange({
        op: 'PATCH',
        table: 'checklist_items',
        id: 'c1',
        opData: { done: 1, done_at: 'x', done_by_user_id: 'u', updated_at: 'x' },
      }),
    ).toEqual({ op: 'PATCH', type: 'checklist_items', id: 'c1', data: { done: 1, done_at: 'x' } });
  });
});
