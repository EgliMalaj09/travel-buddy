/**
 * Dates and numbers the design guide's way: "Thu 12 Nov", 24-hour times, in the admin's own time zone.
 */
const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const dayYear = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

export function formatDay(value: string | null | undefined, now = new Date()): string {
  if (!value) return '–';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return '–';
  return (d.getFullYear() === now.getFullYear() ? day : dayYear).format(d).replace(',', '');
}

export function formatDateTime(value: string | null | undefined, now = new Date()): string {
  if (!value) return '–';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '–';
  return `${formatDay(value, now)}, ${time.format(d)}`;
}

/** "in 12 days", "today", "3 days ago". */
export function relativeDays(value: string | null | undefined, now = new Date()): string {
  if (!value) return '';
  const days = Math.round((new Date(value).getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days > 0) return days === 1 ? 'in 1 day' : `in ${days} days`;
  return days === -1 ? '1 day ago' : `${-days} days ago`;
}

const number = new Intl.NumberFormat('en-GB');
export const formatNumber = (n: number | string) => number.format(Number(n));

export const statusText: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  deletion_requested: 'Deleting',
};

export const statusTone: Record<string, string> = {
  active: 'go',
  suspended: 'flare',
  deletion_requested: 'sun',
};

export const reasonText: Record<string, string> = {
  abuse: 'Abuse',
  fraud: 'Fraud',
  security: 'Security (account at risk)',
  legal: 'Legal request',
  other: 'Other',
};
