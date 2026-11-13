import type { AutoFields, ChecklistPlan } from '@/lib/checklist';
import { newId } from '@/lib/ids';

import { notifyDataChanged } from '../changes';
import { rowToChecklistItem, type Row } from '../local/rows';
import type {
  ChecklistItem,
  ChecklistItemType,
  PackingCategory,
  SyncFields,
  TaskCategory,
} from '../types';
import type { LocalDb } from './localTripRepository';

/** What the user can add or change by hand. */
export interface ChecklistEdit {
  title: string;
  notes: string | null;
  category: TaskCategory | PackingCategory;
  /** Packing items only: how many (1 to 99). Left out for to-dos. */
  quantity?: number | null;
}

export const QUANTITY_MAX = 99;

/**
 * Checklist items of a trip (KAN-24). Screens never touch the database: they use this.
 * Deleted items are soft deleted (deletedAt), and `listItems` returns them too, so the rules
 * know which auto items the user removed and never add them again.
 */
export interface ChecklistRepository {
  /** All items of the trip, deleted ones included (filter on `deletedAt` to show them). */
  listItems(tripId: string): Promise<ChecklistItem[]>;
  /**
   * Writes the rules' new and changed items in one go. With a rules version (the to-do rules) it
   * also notes that version on the trip; the packing rules pass none.
   */
  applyPlan(tripId: string, plan: ChecklistPlan, rulesVersion?: string): Promise<void>;
  /** A to-do by default; `type` "packing" adds a packing item. */
  addItem(tripId: string, edit: ChecklistEdit, type?: ChecklistItemType): Promise<ChecklistItem>;
  /** A hand edit. An auto item becomes the user's own, so the rules never change it again. */
  editItem(id: string, edit: ChecklistEdit): Promise<void>;
  setDone(id: string, done: boolean): Promise<void>;
  deleteItems(ids: string[]): Promise<void>;
  reset?(): void;
}

export function checklistEditProblem(edit: ChecklistEdit): string | null {
  if (!edit.title.trim()) return 'Give the item a name.';
  if (edit.title.trim().length > 120) return 'The name can be up to 120 characters.';
  if ((edit.notes?.trim().length ?? 0) > 1000) return 'Notes can be up to 1000 characters.';
  if (
    edit.quantity != null &&
    (!Number.isInteger(edit.quantity) || edit.quantity < 1 || edit.quantity > QUANTITY_MAX)
  )
    return `How many: 1 to ${QUANTITY_MAX}.`;
  return null;
}

const check = (edit: ChecklistEdit) => {
  const problem = checklistEditProblem(edit);
  if (problem) throw new Error(problem);
};

const cleanNotes = (notes: string | null) => (notes?.trim() ? notes.trim() : null);

/** The quantity to save: packing items keep theirs (1 when empty), to-dos have none. */
const quantityFor = (type: ChecklistItemType, quantity: number | null | undefined) =>
  type === 'packing' ? (quantity ?? 1) : null;

/** In memory: mock mode, and the web preview (no local database there; nothing is kept after a reload). */
export function createMemoryChecklistRepository(
  now: () => string = () => new Date().toISOString(),
): ChecklistRepository {
  let items: ChecklistItem[] = [];
  const fresh = (): SyncFields => {
    const at = now();
    return { createdAt: at, updatedAt: at, deletedAt: null, version: 1 };
  };
  const change = (id: string, changes: Partial<ChecklistItem>) => {
    items = items.map((i) =>
      i.id === id ? { ...i, ...changes, updatedAt: now(), version: i.version + 1 } : i,
    );
  };
  const base = (tripId: string, type: ChecklistItemType = 'task') => ({
    tripId,
    type,
    done: false,
    doneAt: null,
    doneByUserId: null,
    quantity: null,
    ownerUserId: null,
  });

  return {
    async listItems(tripId) {
      return items.filter((i) => i.tripId === tripId);
    },
    async applyPlan(tripId, plan) {
      for (const a of plan.add) {
        if (items.some((i) => i.id === a.id)) continue;
        const { type, ...fields } = a;
        items.push({ ...base(tripId, type), ...fields, source: 'auto', ...fresh() });
      }
      for (const u of plan.update) change(u.id, u.changes);
      if (plan.add.length || plan.update.length) notifyDataChanged();
    },
    async addItem(tripId, edit, type = 'task') {
      check(edit);
      const sortOrder =
        Math.max(0, ...items.filter((i) => i.tripId === tripId).map((i) => i.sortOrder)) + 10;
      const item: ChecklistItem = {
        ...base(tripId, type),
        quantity: quantityFor(type, edit.quantity),
        id: newId(),
        title: edit.title.trim(),
        notes: cleanNotes(edit.notes),
        category: edit.category,
        dueDate: null,
        reason: 'user',
        source: 'user',
        ruleId: null,
        sourceUrl: null,
        sourceCheckedAt: null,
        sortOrder,
        ...fresh(),
      };
      items.push(item);
      notifyDataChanged();
      return item;
    },
    async editItem(id, edit) {
      check(edit);
      const item = items.find((i) => i.id === id);
      change(id, {
        title: edit.title.trim(),
        notes: cleanNotes(edit.notes),
        category: edit.category,
        ...(item?.type === 'packing' && edit.quantity !== undefined
          ? { quantity: quantityFor('packing', edit.quantity) }
          : {}),
        source: 'user',
      });
      notifyDataChanged();
    },
    async setDone(id, done) {
      change(id, { done, doneAt: done ? now() : null });
      notifyDataChanged();
    },
    async deleteItems(ids) {
      const at = now();
      for (const id of ids) change(id, { deletedAt: at });
      notifyDataChanged();
    },
    reset() {
      items = [];
    },
  };
}

/** In the phone's local database, synced by PowerSync like the trips (KAN-15). */
export function createLocalChecklistRepository(
  db: LocalDb,
  now: () => string = () => new Date().toISOString(),
): ChecklistRepository {
  type Tx = Parameters<Parameters<LocalDb['writeTransaction']>[0]>[0];
  const update = (tx: Tx, id: string, values: Row) => {
    const columns = Object.keys(values);
    return tx.execute(
      `UPDATE checklist_items SET ${columns.map((c) => `"${c}" = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
      [...Object.values(values), now(), id],
    );
  };
  const insert = (tx: Tx, values: Row) => {
    const at = now();
    const row: Row = { ...values, created_at: at, updated_at: at, deleted_at: null, version: 0 };
    const columns = Object.keys(row);
    return tx.execute(
      `INSERT INTO checklist_items (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      Object.values(row),
    );
  };
  const autoColumns = (f: Partial<AutoFields>): Row => {
    const map: Record<keyof AutoFields, string> = {
      title: 'title',
      notes: 'notes',
      category: 'category',
      reason: 'reason',
      dueDate: 'due_date',
      sourceUrl: 'source_url',
      sourceCheckedAt: 'source_checked_at',
      sortOrder: 'sort_order',
      quantity: 'quantity',
    };
    return Object.fromEntries(
      (Object.keys(f) as (keyof AutoFields)[]).map((k) => [map[k], f[k] ?? null]),
    );
  };
  const base = (tripId: string, type: ChecklistItemType = 'task'): Row => ({
    trip_id: tripId,
    type,
    done: 0,
    done_at: null,
    done_by_user_id: null,
    quantity: null,
    owner_user_id: null,
  });

  return {
    async listItems(tripId) {
      const rows = await db.getAll('SELECT * FROM checklist_items WHERE trip_id = ?', [tripId]);
      return rows.map(rowToChecklistItem);
    },
    async applyPlan(tripId, plan, rulesVersion) {
      if (!plan.add.length && !plan.update.length) return;
      await db.writeTransaction(async (tx) => {
        for (const a of plan.add) {
          // Another phone may have made the same item already (same id): keep that one.
          const there = await tx.getAll('SELECT id FROM checklist_items WHERE id = ?', [a.id]);
          if (there.length) continue;
          const { id, ruleId, type, ...fields } = a;
          await insert(tx, {
            id,
            ...base(tripId, type),
            ...autoColumns(fields),
            source: 'auto',
            rule_id: ruleId,
          });
        }
        for (const u of plan.update) await update(tx, u.id, autoColumns(u.changes));
        if (rulesVersion) {
          await tx.execute(
            'UPDATE trips SET checklist_generated_at = ?, checklist_rules_version = ?, updated_at = ? WHERE id = ?',
            [now(), rulesVersion, now(), tripId],
          );
        }
      });
      notifyDataChanged();
    },
    async addItem(tripId, edit, type = 'task') {
      check(edit);
      const id = newId();
      await db.writeTransaction(async (tx) => {
        const [max] = await tx.getAll<{ m: number | null }>(
          'SELECT MAX(sort_order) AS m FROM checklist_items WHERE trip_id = ?',
          [tripId],
        );
        await insert(tx, {
          id,
          ...base(tripId, type),
          quantity: quantityFor(type, edit.quantity),
          title: edit.title.trim(),
          notes: cleanNotes(edit.notes),
          category: edit.category,
          due_date: null,
          reason: 'user',
          source: 'user',
          rule_id: null,
          source_url: null,
          source_checked_at: null,
          sort_order: (max?.m ?? 0) + 10,
        });
      });
      notifyDataChanged();
      const [row] = await db.getAll('SELECT * FROM checklist_items WHERE id = ?', [id]);
      if (!row) throw new Error('The item was not saved. Please try again.');
      return rowToChecklistItem(row);
    },
    async editItem(id, edit) {
      check(edit);
      await db.writeTransaction(async (tx) => {
        const [row] = await tx.getAll<{ type: string }>(
          'SELECT type FROM checklist_items WHERE id = ?',
          [id],
        );
        await update(tx, id, {
          title: edit.title.trim(),
          notes: cleanNotes(edit.notes),
          category: edit.category,
          ...(row?.type === 'packing' && edit.quantity !== undefined
            ? { quantity: quantityFor('packing', edit.quantity) }
            : {}),
          source: 'user',
        });
      });
      notifyDataChanged();
    },
    async setDone(id, done) {
      await db.writeTransaction((tx) =>
        update(tx, id, { done: done ? 1 : 0, done_at: done ? now() : null }),
      );
      notifyDataChanged();
    },
    async deleteItems(ids) {
      // Soft delete on the phone: the upload turns it into a DELETE (local/uploadChanges.ts).
      await db.writeTransaction(async (tx) => {
        for (const id of ids) await update(tx, id, { deleted_at: now() });
      });
      notifyDataChanged();
    },
  };
}
