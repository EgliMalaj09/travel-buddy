import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useDataVersion } from '@/data';
import { planReminders } from '@/lib/reminders';
import { clearReminders, onReminderTapped, scheduleReminders } from '@/services/reminders';
import { captureError } from '@/services/sentry';

import { loadReminderInput } from './reminderInput';

/**
 * One planning run at a time. Syncing can change trip data many times in a row; without this an
 * older run could finish after a newer one and put back reminders for a trip that was removed.
 */
let running: Promise<void> = Promise.resolve();
const oneAtATime = (run: () => Promise<void>) => {
  running = running.then(run, run);
  return running;
};

/**
 * Keeps the phone's reminders in step with the trips (KAN-32): planned again whenever trip data
 * changes, cleared on log out. Tapping a reminder opens its trip.
 */
export function useReminderSync(signedIn: boolean): void {
  const version = useDataVersion();
  // Plan again when the app comes back to the front (a new day, or notifications turned on in
  // the phone's settings).
  const [wakes, setWakes] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setWakes((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      void oneAtATime(clearReminders).catch(captureError);
      return;
    }
    let cancelled = false;
    void oneAtATime(async () => {
      if (cancelled) return;
      const input = await loadReminderInput();
      if (cancelled) return;
      await scheduleReminders(planReminders({ ...input, now: new Date() }));
    }).catch(captureError);
    return () => {
      cancelled = true;
    };
  }, [signedIn, version, wakes]);

  useEffect(() => {
    if (!signedIn) return;
    return onReminderTapped((tripId) => router.push(`/trip/${tripId}`));
  }, [signedIn]);
}
