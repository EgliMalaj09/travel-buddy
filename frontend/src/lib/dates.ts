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

/** Year and month (1–12) of an ISO date. */
export function monthOf(date: IsoDate): { year: number; month: number } {
  const [y, m] = date.split('-').map(Number);
  return { year: y ?? 1970, month: m ?? 1 };
}

export function addMonths(
  { year, month }: { year: number; month: number },
  n: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * The days of a month as weeks starting on Monday. Empty cells (before the 1st and after
 * the last day) are null.
 */
export function monthGrid(year: number, month: number): (IsoDate | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (IsoDate | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (IsoDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const monthFormat = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** "April 2027" */
export function formatMonth(year: number, month: number): string {
  return monthFormat.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** "Mon 12 Apr" */
export function formatDay(date: IsoDate): string {
  return dayFormat.format(new Date(toUtc(date)));
}
