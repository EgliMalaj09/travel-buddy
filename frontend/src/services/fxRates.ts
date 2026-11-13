import { api } from '@/api/client';
import type { IsoDate } from '@/data/types';
import type { RatesToEur } from '@/lib/money';

import { getDeviceValue, setDeviceValue } from './deviceStorage';

/**
 * Daily exchange rates for expenses (KAN-42), from our server (GET /fx/rates, the free Currency
 * API behind it). The phone keeps what it got, so totals still convert offline:
 * - a "final" day (the day's own rates) is kept for good: a past day's rate never changes;
 * - a day not final yet (today before the rates are out, a future day) is asked again after a while.
 * Only days, currency codes and numbers are kept: nothing about the expenses. Nothing is logged.
 */
const CACHE = 'fxRates';
/** Not-final days are asked again after this long. */
const PROVISIONAL_MS = 6 * 60 * 60 * 1000;
/** After a failed call, wait a minute before asking again (every list change reloads the screen). */
const RETRY_MS = 60 * 1000;
/** Days kept on the phone; the oldest go first. */
const MAX_DAYS = 800;
/** Same limits as the server (FxValues). */
const MAX_DATES_PER_CALL = 62;
const MAX_CURRENCIES_PER_CALL = 30;

export interface FxDay {
  /** The day the rates are from (may be earlier than the asked day when not final). */
  rateDate: IsoDate | null;
  final: boolean;
  fetchedAt: string;
  rates: Record<string, number>;
}

type Cache = Record<IsoDate, FxDay>;

let lastFailure: number | undefined;

function readCache(): Cache {
  try {
    const raw = getDeviceValue(CACHE);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache) {
  const kept = Object.entries(cache)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, MAX_DAYS);
  try {
    setDeviceValue(CACHE, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // A full or broken store only means the next screen asks the server again.
  }
}

/** Called when the logged-in user changes: the next user starts with no kept days. */
export function clearFxCache() {
  lastFailure = undefined;
  try {
    setDeviceValue(CACHE, '{}');
  } catch {
    // Nothing kept.
  }
}

/** One call to the server, or null when it fails (offline, server down). */
export type FetchFx = (
  dates: IsoDate[],
  currencies: string[],
) => Promise<
  { date: IsoDate; rateDate: IsoDate | null; final: boolean; rates: RatesToEur }[] | null
>;

const fetchFromApi: FetchFx = async (dates, currencies) => {
  try {
    const { data, response } = await api.GET('/fx/rates', {
      params: { query: { dates: dates.join(','), currencies: currencies.join(',') } },
    });
    if (!response.ok || !data) return null;
    return data.days.map((d) => ({
      date: d.date,
      rateDate: d.rateDate ?? null,
      final: d.final,
      rates: Object.fromEntries(Object.entries(d.ratesToEur).map(([k, v]) => [k, Number(v)])),
    }));
  } catch {
    return null;
  }
};

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * The rates of each asked day for the asked currencies. Kept days that have every currency are
 * used as they are (a not-final day for 6 hours); the rest are asked from the server. A day the server can't answer (offline)
 * is left out, so the screen shows "converting…" for it.
 */
export async function getFxRates(
  dates: IsoDate[],
  currencies: string[],
  { now = new Date(), fetchFx = fetchFromApi }: { now?: Date; fetchFx?: FetchFx } = {},
): Promise<Record<IsoDate, FxDay>> {
  const wanted = [...new Set(currencies.filter((c) => /^[A-Z]{3}$/.test(c) && c !== 'EUR'))].sort();
  const days = [...new Set(dates)].sort();
  const cache = readCache();
  const has = (day: FxDay | undefined) => !!day && wanted.every((c) => c in day.rates);
  const usable = (day: FxDay | undefined) =>
    has(day) && (day!.final || now.getTime() - Date.parse(day!.fetchedAt) < PROVISIONAL_MS);

  const missing = days.filter((d) => !usable(cache[d]));
  // Every kept day, even with only some of the currencies: each expense converts when its own
  // currency is there.
  const pick = () =>
    Object.fromEntries(days.filter((d) => cache[d]?.rateDate).map((d) => [d, cache[d]!]));
  if (!missing.length || !wanted.length) return wanted.length ? pick() : {};
  if (lastFailure !== undefined && now.getTime() - lastFailure < RETRY_MS) return pick();

  let failed = false;
  for (const dateChunk of chunks(missing, MAX_DATES_PER_CALL)) {
    for (const currencyChunk of chunks(wanted, MAX_CURRENCIES_PER_CALL)) {
      const answer = await fetchFx(dateChunk, currencyChunk);
      if (!answer) {
        failed = true;
        continue;
      }
      for (const day of answer) {
        if (!day.rateDate) continue;
        const before = cache[day.date];
        // A final day never goes back to a provisional answer.
        if (before?.final && !day.final) continue;
        const sameSource = before && before.rateDate === day.rateDate;
        cache[day.date] = {
          rateDate: day.rateDate,
          final: day.final,
          fetchedAt: now.toISOString(),
          rates: { ...(sameSource ? before.rates : {}), ...day.rates },
        };
      }
    }
  }
  lastFailure = failed ? now.getTime() : undefined;
  writeCache(cache);
  return pick();
}
