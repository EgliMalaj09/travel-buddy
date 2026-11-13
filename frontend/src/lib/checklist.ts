import type {
  ChecklistItem,
  ChecklistItemType,
  IsoDate,
  PackingCategory,
  TaskCategory,
} from '@/data/types';

import type { ChecklistSuggestion } from './checklistRules';
import { stableId } from './stableId';

/** The id of an auto item: the same on every phone for the same trip and rule. */
export const autoItemId = (tripId: string, ruleId: string) =>
  stableId(`checklist:${tripId}:${ruleId}`);

/** The rule-made fields of an auto item, as the repository writes them. */
export type AutoFields = Pick<
  ChecklistItem,
  | 'title'
  | 'notes'
  | 'category'
  | 'reason'
  | 'dueDate'
  | 'sourceUrl'
  | 'sourceCheckedAt'
  | 'sortOrder'
  | 'quantity'
>;

/**
 * One item the rules want: a to-do (checklistRules.ts) or a packing item (packingRules.ts).
 * Packing rule ids start with "pack-", so they never meet a to-do rule id.
 */
export type ItemSuggestion = Omit<ChecklistSuggestion, 'category'> & {
  category: TaskCategory | PackingCategory;
  /** Default "task". */
  type?: ChecklistItemType;
  /** Packing only. */
  quantity?: number | null;
};

export type PlannedItem = AutoFields & { id: string; ruleId: string; type: ChecklistItemType };

export interface ChecklistPlan {
  /** New auto items (id made with autoItemId). */
  add: PlannedItem[];
  /** Auto items the user has not touched whose rule text or due date changed (dates moved, new rules). */
  update: { id: string; changes: Partial<AutoFields> }[];
}

const fieldsOf = (s: ItemSuggestion): AutoFields => ({
  title: s.title,
  notes: s.notes,
  category: s.category,
  reason: s.reason,
  dueDate: s.dueDate,
  sourceUrl: s.sourceUrl,
  sourceCheckedAt: s.sourceCheckedAt,
  sortOrder: s.sortOrder,
  quantity: s.quantity ?? null,
});

/**
 * What to write so the trip's list matches the rules (data model 10):
 * - a rule with no item gets one;
 * - a deleted auto item stays deleted (its row is kept with deletedAt, so its rule id is known);
 * - items the user added, edited (source "user") or ticked are never changed;
 * - nothing is removed here: items the rules no longer want are shown under "No longer needed",
 *   and the user removes them (that is the "undo": nothing goes without the user seeing it).
 *
 * `items` must include deleted rows.
 */
export function planChecklist(
  tripId: string,
  items: ChecklistItem[],
  suggestions: ItemSuggestion[],
): ChecklistPlan {
  const byRule = new Map(items.filter((i) => i.ruleId).map((i) => [i.ruleId!, i]));
  const plan: ChecklistPlan = { add: [], update: [] };
  for (const s of suggestions) {
    const item = byRule.get(s.ruleId) ?? items.find((i) => i.id === autoItemId(tripId, s.ruleId));
    const wanted = fieldsOf(s);
    if (!item) {
      plan.add.push({
        id: autoItemId(tripId, s.ruleId),
        ruleId: s.ruleId,
        type: s.type ?? 'task',
        ...wanted,
      });
      continue;
    }
    if (item.deletedAt || item.source !== 'auto' || item.done) continue;
    const changes = Object.fromEntries(
      (Object.keys(wanted) as (keyof AutoFields)[])
        .filter((k) => item[k] !== wanted[k])
        .map((k) => [k, wanted[k]]),
    ) as Partial<AutoFields>;
    if (Object.keys(changes).length > 0) plan.update.push({ id: item.id, changes });
  }
  return plan;
}

export const taskCategoryLabels: Record<TaskCategory, string> = {
  documents: 'Documents',
  money: 'Money',
  health: 'Health',
  phone: 'Phone',
  transport: 'Getting there',
  stay: 'Where you sleep',
  other: 'Other',
};

export const taskCategories = Object.keys(taskCategoryLabels) as TaskCategory[];

export interface ChecklistSection {
  category: TaskCategory;
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistView {
  sections: ChecklistSection[];
  /** Auto items the rules no longer want, not ticked and not edited. */
  noLongerNeeded: ChecklistItem[];
  done: number;
  total: number;
  /** The first open item by due date, for the trip page. */
  next: ChecklistItem | null;
}

export const byDueThenOrder = (a: ChecklistItem, b: ChecklistItem) =>
  (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.sortOrder - b.sortOrder;

/** The task list as the screens show it. Deleted rows are left out. */
export function checklistView(
  items: ChecklistItem[],
  suggestions: ChecklistSuggestion[],
): ChecklistView {
  const wanted = new Set(suggestions.map((s) => s.ruleId));
  const live = items.filter((i) => !i.deletedAt && i.type === 'task');
  const noLongerNeeded = live.filter(
    (i) => i.source === 'auto' && !i.done && !!i.ruleId && !wanted.has(i.ruleId),
  );
  const shown = live.filter((i) => !noLongerNeeded.includes(i));
  const sections = taskCategories
    .map((category) => ({
      category,
      title: taskCategoryLabels[category],
      items: shown.filter((i) => i.category === category).sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((s) => s.items.length > 0);
  const open = shown.filter((i) => !i.done).sort(byDueThenOrder);
  return {
    sections,
    noLongerNeeded,
    done: shown.filter((i) => i.done).length,
    total: shown.length,
    next: open[0] ?? null,
  };
}

/** "Due today", "Due in 3 days", "Do this soon" (date passed, e.g. a trip planned late), or null. */
export function dueLabel(due: IsoDate | null, today: IsoDate): string | null {
  if (!due) return null;
  const days = Math.round((Date.parse(due) - Date.parse(today)) / 86_400_000);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days} days`;
  return 'Do this soon';
}
