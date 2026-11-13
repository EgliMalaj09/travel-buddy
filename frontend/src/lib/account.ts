/**
 * Small pure helpers for the account screens (KAN-21/22): delete confirmation, the 30-day date,
 * the export file name.
 */

/** The word the user types to confirm "Delete my account". The server checks it too. */
export const DELETE_WORD = 'DELETE';

/** True when the typed text is the confirm word (spaces around it and letter case are forgiven). */
export function confirmsDelete(typed: string): boolean {
  return typed.trim().toUpperCase() === DELETE_WORD;
}

/** "13 December 2026" for the day the account is erased. Empty when the date can't be read. */
export function deletionDay(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale ?? 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Whole days left until `iso` (0 when it has passed). */
export function daysLeft(iso: string, now = new Date()): number {
  const ms = new Date(iso).getTime() - now.getTime();
  return Number.isNaN(ms) || ms <= 0 ? 0 : Math.ceil(ms / (24 * 3600 * 1000));
}

/** "travel-app-my-data-2026-11-13.json". */
export function exportFileName(now = new Date()): string {
  return `travel-app-my-data-${now.toISOString().slice(0, 10)}.json`;
}

/** True for a file made by "Download my data". */
export function isExportFileName(name: string): boolean {
  return /^travel-app-my-data-\d{4}-\d{2}-\d{2}\.json$/.test(name);
}
