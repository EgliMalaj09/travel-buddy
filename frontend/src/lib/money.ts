/**
 * Money helpers (Expenses, KAN-42). Amounts are whole numbers in minor units (data model rule:
 * 1250 = 12.50 EUR, 1500 = 1500 JPY), so adding them up never rounds.
 */

/**
 * ISO 4217 currencies that do not use 2 decimals (data model 18, Currency.minorUnits). Our own
 * table, not the phone's Intl data, so every phone and the tests agree.
 */
const ZERO_DECIMALS = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'UYI',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);
const THREE_DECIMALS = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

/** Same limit as the server (ExpenseValues.AmountMinorMax). */
export const AMOUNT_MINOR_MAX = 1_000_000_000_000;

export function minorUnits(currency: string): number {
  if (ZERO_DECIMALS.has(currency)) return 0;
  if (THREE_DECIMALS.has(currency)) return 3;
  return 2;
}

/**
 * What the user typed ("12.5", "12,50", "1 200", "1,200.50") as minor units in that currency.
 * Null when it is not a positive amount, or has more decimals than the currency allows.
 */
export function parseAmount(text: string, currency: string): number | null {
  const decimals = minorUnits(currency);
  let s = text.trim().replace(/[\s '’]/g, '');
  if (!s) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    // Both used: the last one is the decimal mark, the other groups thousands.
    const decimalMark = lastDot > lastComma ? '.' : ',';
    const group = decimalMark === '.' ? ',' : '.';
    s = s.split(group).join('').replace(decimalMark, '.');
  } else if (lastDot >= 0 && decimals !== 3 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.200" or "1.200.000": dots grouping thousands (a 2-decimal amount never has 3 decimals).
    s = s.split('.').join('');
  } else if (lastComma >= 0) {
    // Only commas: "12,50" is a decimal; "1,200" (exactly 3 digits after, once or more) groups.
    s =
      /^\d{1,3}(,\d{3})+$/.test(s) && decimals !== 3 ? s.split(',').join('') : s.replace(',', '.');
  }
  if (!/^\d+(\.\d*)?$/.test(s) && !/^\.\d+$/.test(s)) return null;
  const [whole = '0', fraction = ''] = s.split('.');
  if (fraction.length > decimals) return null;
  const minor =
    Number(whole || '0') * 10 ** decimals + Number(fraction.padEnd(decimals, '0') || '0');
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > AMOUNT_MINOR_MAX) return null;
  return minor;
}

/** Minor units back to the text shown in the amount field ("12.50"). */
export function amountText(minor: number, currency: string): string {
  const decimals = minorUnits(currency);
  if (decimals === 0) return String(minor);
  const s = String(minor).padStart(decimals + 1, '0');
  return `${s.slice(0, -decimals)}.${s.slice(-decimals)}`;
}

const formatters = new Map<string, Intl.NumberFormat>();

/** "MAD 200.00", "€12.50", "¥1,500": the phone's own currency formatting, with our decimals. */
export function formatMoney(minor: number, currency: string): string {
  const decimals = minorUnits(currency);
  let format = formatters.get(currency);
  if (!format) {
    try {
      format = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch {
      format = new Intl.NumberFormat('en-GB', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      const plain = format;
      format = { format: (n: number) => `${plain.format(n)} ${currency}` } as Intl.NumberFormat;
    }
    formatters.set(currency, format);
  }
  return format.format(minor / 10 ** decimals);
}

/** Units of each currency for 1 euro, on one day (FxRate). */
export type RatesToEur = Readonly<Record<string, number>>;

/**
 * An amount in another currency, rounded to its minor units (data model 13):
 * home = amount ÷ rateToEur(currency) × rateToEur(home). Null when a rate is missing.
 */
export function convertMinor(
  minor: number,
  from: string,
  to: string,
  rates: RatesToEur | undefined,
): number | null {
  if (from === to) return minor;
  const fromRate = from === 'EUR' ? 1 : rates?.[from];
  const toRate = to === 'EUR' ? 1 : rates?.[to];
  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) return null;
  const amount = minor / 10 ** minorUnits(from);
  return Math.round((amount / fromRate) * toRate * 10 ** minorUnits(to));
}
