import type { ChecklistItem, PackingCategory } from '@/data/types';

import type { ItemSuggestion } from './checklist';

export const packingCategoryLabels: Record<PackingCategory, string> = {
  documents: 'Documents and money',
  clothes: 'Clothes',
  toiletries: 'Toiletries and health',
  tech: 'Tech',
  other: 'Other',
};

export const packingCategories: PackingCategory[] = [
  'documents',
  'clothes',
  'toiletries',
  'tech',
  'other',
];

export interface PackingSection {
  category: PackingCategory;
  title: string;
  items: ChecklistItem[];
}

export interface PackingView {
  sections: PackingSection[];
  /** Auto items the rules no longer want, not packed and not edited. */
  noLongerNeeded: ChecklistItem[];
  packed: number;
  total: number;
}

/**
 * The packing list as the screens show it (deleted rows left out). Works like the to-do view:
 * nothing goes away by itself. When the weather is not known (offline the first time), weather
 * items are kept as they are and never shown as "no longer needed".
 */
export function packingView(
  items: ChecklistItem[],
  suggestions: ItemSuggestion[],
  weatherKnown: boolean,
): PackingView {
  const wanted = new Set(suggestions.map((s) => s.ruleId));
  const live = items.filter((i) => !i.deletedAt && i.type === 'packing');
  const noLongerNeeded = live.filter(
    (i) =>
      i.source === 'auto' &&
      !i.done &&
      !!i.ruleId &&
      !wanted.has(i.ruleId) &&
      (weatherKnown || i.reason !== 'weather'),
  );
  const shown = live.filter((i) => !noLongerNeeded.includes(i));
  const sections = packingCategories
    .map((category) => ({
      category,
      title: packingCategoryLabels[category],
      items: shown
        .filter(
          (i) =>
            (packingCategories.includes(i.category as PackingCategory) ? i.category : 'other') ===
            category,
        )
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((s) => s.items.length > 0);
  return {
    sections,
    noLongerNeeded,
    packed: shown.filter((i) => i.done).length,
    total: shown.length,
  };
}

/** "Socks × 5", or just the title for one. */
export const packingTitle = (item: Pick<ChecklistItem, 'title' | 'quantity'>) =>
  item.quantity && item.quantity > 1 ? `${item.title} × ${item.quantity}` : item.title;
