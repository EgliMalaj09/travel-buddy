import type { IsoDate } from '@/data/types';

/**
 * Small date helpers on plain ISO dates ("YYYY-MM-DD"), done in UTC so time zones
 * never shift a day. A date library will be chosen (and added to tech-stack.md)
 * when Create a trip needs more.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function todayIso(now: Date = new Date()): IsoDate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const t = new Date(toUtc(date) + days * DAY_MS);
  return t.toISOString().slice(0, 10);
}

const shortFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const longFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "12 Apr – 18 Apr 2027", or "Dates not set". */
export function formatDateRange(start: IsoDate | null, end: IsoDate | null): string {
  if (!start) return 'Dates not set';
  const s = new Date(toUtc(start));
  if (!end) return longFormat.format(s);
  return `${shortFormat.format(s)} – ${longFormat.format(new Date(toUtc(end)))}`;
}
