import { getFlag, setFlag } from '@/services/deviceStorage';

/**
 * How long each part of the animated splash takes (milliseconds).
 * - First launch: the plane flies its route, then the arrival stamp lands (about 2.2 s).
 * - Later launches: only the stamp lands (about 0.9 s), so opening the app stays quick.
 * - "Reduce motion" on the phone: no movement, the stamp just shows and fades.
 */
export interface SplashPlan {
  kind: 'full' | 'short' | 'still';
  /** Plane flight along the dashed route. 0 = no flight. */
  flight: number;
  /** Stamp coming down onto the page. */
  stamp: number;
  /** Time the stamp stays before the splash may fade. */
  hold: number;
  /** Fade into the app. */
  fadeOut: number;
}

export function splashPlan(firstLaunch: boolean, reduceMotion: boolean): SplashPlan {
  if (reduceMotion) return { kind: 'still', flight: 0, stamp: 0, hold: 500, fadeOut: 200 };
  if (firstLaunch) return { kind: 'full', flight: 1100, stamp: 450, hold: 450, fadeOut: 300 };
  return { kind: 'short', flight: 0, stamp: 380, hold: 250, fadeOut: 250 };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Date printed on the stamp, passport style: "12 NOV 2026". */
export function stampDate(now: Date = new Date()): string {
  const day = String(now.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

const SEEN_FLAG = 'splashSeen';

/** True only the very first time the app opens on this phone. Marks it as seen. */
export function takeFirstLaunch(): boolean {
  const seen = getFlag(SEEN_FLAG);
  if (!seen) setFlag(SEEN_FLAG, true);
  return !seen;
}
