import { settingsFromRow, settingsToRow, type UserSettings } from '@/lib/settings';

import { notifyDataChanged } from '../changes';
import type { LocalDb } from './localTripRepository';

/**
 * The account's settings row (UserSettings, KAN-21/22) in the phone's database. PowerSync sends
 * changes to the server and brings the row from other phones. The row id is the user id.
 */
export interface SettingsRepository {
  /** The saved row, or null when this phone has none yet (not downloaded, or never changed). */
  read(userId: string): Promise<UserSettings | null>;
  /** Saves all settings (creates the row the first time). */
  save(userId: string, settings: UserSettings): Promise<void>;
}

export function createLocalSettingsRepository(db: LocalDb): SettingsRepository {
  return {
    async read(userId) {
      const rows = await db.getAll('SELECT * FROM user_settings WHERE id = ?', [userId]);
      return rows[0] ? settingsFromRow(rows[0]) : null;
    },
    async save(userId, settings) {
      const row = settingsToRow(settings);
      const now = new Date().toISOString();
      await db.writeTransaction(async (tx) => {
        const [current] = await tx.getAll('SELECT * FROM user_settings WHERE id = ?', [userId]);
        const columns = Object.keys(row);
        if (current) {
          // Only the changed columns travel (PATCH): two phones changing different switches both win.
          const changed = columns.filter((c) => current[c] !== row[c]);
          if (changed.length === 0) return;
          await tx.execute(
            `UPDATE user_settings SET ${changed.map((c) => `"${c}" = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
            [...changed.map((c) => row[c]), now, userId],
          );
        } else {
          await tx.execute(
            `INSERT INTO user_settings (id, ${columns.map((c) => `"${c}"`).join(', ')}, created_at, updated_at) VALUES (?, ${columns.map(() => '?').join(', ')}, ?, ?)`,
            [userId, ...columns.map((c) => row[c]), now, now],
          );
        }
      });
      notifyDataChanged();
    },
  };
}
