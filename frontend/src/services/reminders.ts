import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';

import type { PlannedReminder } from '@/lib/reminders';

import { getFlag, setFlag } from './deviceStorage';

/**
 * Local reminders on the phone (KAN-32), with `expo-notifications` (decisions/tech-stack.md).
 * They are planned by `planReminders` and work offline, with no account or server.
 * On the web build nothing is scheduled.
 */

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const CHANNEL = 'reminders';
const ASKED_FLAG = 'remindersPermissionAsked';

export type ReminderPermission = 'granted' | 'denied' | 'notAsked' | 'unsupported';

let configured = false;
function configure(): void {
  if (configured || !remindersSupported) return;
  configured = true;
  // Also show a reminder while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Trip reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }
}

export async function reminderPermission(): Promise<ReminderPermission> {
  if (!remindersSupported) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'notAsked';
}

/**
 * Agreed 12 Nov 2026: ask once, right after the first trip with dates is saved, with one line
 * saying why. "Not now" is remembered so we don't ask on every trip.
 * Returns true when reminders were just turned on.
 */
export async function askReminderPermissionOnce(): Promise<boolean> {
  if (!remindersSupported || getFlag(ASKED_FLAG)) return false;
  if ((await reminderPermission()) !== 'notAsked') return false;
  setFlag(ASKED_FLAG, true);
  await new Promise<void>((resolve) => {
    Alert.alert(
      'Get reminders for this trip?',
      'We remind you to get ready, to pack and to catch your flight. Nothing else.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve() },
        {
          text: 'Turn on',
          onPress: () => {
            void Notifications.requestPermissionsAsync().finally(() => resolve());
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve() },
    );
  });
  return (await reminderPermission()) === 'granted';
}

/** Asks the phone for notification permission now (Settings screen, KAN-21). True when granted. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  setFlag(ASKED_FLAG, true);
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Opens the phone's settings for this app, to turn notifications back on. */
export function openNotificationSettings(): void {
  void Linking.openSettings();
}

/**
 * Makes the phone's scheduled reminders match the plan. All of this app's scheduled
 * notifications are reminders, so the old ones are cleared and the plan is scheduled again.
 */
export async function scheduleReminders(plan: PlannedReminder[]): Promise<void> {
  if (!remindersSupported) return;
  configure();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await reminderPermission()) !== 'granted') return;
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { tripId: r.tripId, kind: r.kind } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.at,
        channelId: CHANNEL,
      },
    });
  }
}

export async function clearReminders(): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Calls `open(tripId, kind)` when the user taps a reminder (also one that opened the app). */
export function onReminderTapped(open: (tripId: string, kind: string | null) => void): () => void {
  if (!remindersSupported) return () => {};
  configure();
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    const tripId = data?.tripId;
    if (typeof tripId === 'string') open(tripId, typeof data?.kind === 'string' ? data.kind : null);
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) {
    handle(last);
    Notifications.clearLastNotificationResponse();
  }
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
