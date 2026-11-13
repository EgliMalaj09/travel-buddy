import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Design guide motion token "party" (stamp, recap). */
export const PARTY_MS = 640;

/** True when the phone asks for less motion; animations then jump to the end. */
export function useReducedMotion(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((r) => alive && setReduce(r));
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}

/** Counts from 0 up to `target` after `delayMs` (ease out). With reduced motion: the target at once. */
export function useCountUp(target: number, delayMs: number, reduce: boolean | null): number {
  const animate = reduce === false && target > 0;
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const step = (t: number) => {
        start ||= t;
        const p = Math.min(1, (t - start) / PARTY_MS);
        setValue(Math.round(target * (1 - (1 - p) ** 3)));
        if (p < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [animate, target, delayMs]);
  return animate ? value : target;
}
