import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { defaultUserSettings } from '@/lib/settings';

import { settingsTables } from '../../local/tables';
import type { LocalDb } from '../localTripRepository';
import { createLocalSettingsRepository } from '../settingsRepository';

/** The settings table in plain SQLite, with a log of the statements (PUT = INSERT, PATCH = UPDATE). */
function sqliteDb() {
  const sql = new DatabaseSync(':memory:');
  const cols = Object.entries(settingsTables.user_settings).map(([c, type]) => `"${c}" ${type}`);
  sql.exec(`CREATE TABLE user_settings (id TEXT PRIMARY KEY, ${cols.join(', ')})`);
  const statements: string[] = [];
  const all = async <T>(q: string, p: unknown[] = []) =>
    sql.prepare(q).all(...(p as SQLInputValue[])) as T[];
  const db: LocalDb = {
    getAll: all,
    async writeTransaction(work) {
      return work({
        execute: async (q, p) => {
          statements.push(q.split(' ')[0]!);
          return sql.prepare(q).run(...((p ?? []) as SQLInputValue[]));
        },
        getAll: all,
      });
    },
  };
  return { db, statements };
}

describe('settings repository (KAN-21/22)', () => {
  it('has no row until something is saved, then keeps every setting', async () => {
    const { db } = sqliteDb();
    const repo = createLocalSettingsRepository(db);
    expect(await repo.read('user-1')).toBeNull();

    const mine = {
      ...defaultUserSettings,
      remindFlight: false,
      reminderTime: '20:30',
      temperatureUnit: 'F' as const,
    };
    await repo.save('user-1', mine);
    expect(await repo.read('user-1')).toEqual(mine);
    expect(await repo.read('user-2')).toBeNull();
  });

  it('creates the row once, then only updates the columns that changed', async () => {
    const { db, statements } = sqliteDb();
    const repo = createLocalSettingsRepository(db);
    await repo.save('user-1', defaultUserSettings);
    await repo.save('user-1', { ...defaultUserSettings, quietHoursStart: '23:00' });
    await repo.save('user-1', { ...defaultUserSettings, quietHoursStart: '23:00' });
    expect(statements).toEqual(['INSERT', 'UPDATE']);
    expect((await repo.read('user-1'))?.quietHoursStart).toBe('23:00');
  });
});
