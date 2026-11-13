import { defaultReminderSettings, type ReminderSettings } from './reminders';

/**
 * UserSettings (data model, section 4): one per account. Pure helpers only; storage is in
 * `src/services/userSettings.ts`.
 */
export interface UserSettings extends ReminderSettings {
  remindAnniversary: boolean;
  distanceUnit: 'km' | 'mi';
  temperatureUnit: 'C' | 'F';
  defaultPlaceScope: 'shared' | 'personal';
}

export const defaultUserSettings: UserSettings = {
  ...defaultReminderSettings,
  remindAnniversary: true,
  distanceUnit: 'km',
  temperatureUnit: 'C',
  defaultPlaceScope: 'shared',
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** True for a valid "HH:MM" (00:00–23:59). */
export function isTime(value: unknown): value is string {
  return typeof value === 'string' && HHMM.test(value);
}

/**
 * Reads stored settings. Anything missing or broken falls back to the default for that field,
 * so an old or damaged value never stops reminders from working.
 */
export function parseUserSettings(raw: string | null | undefined): UserSettings {
  if (!raw) return defaultUserSettings;
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultUserSettings;
    data = parsed as Record<string, unknown>;
  } catch {
    return defaultUserSettings;
  }
  const out: UserSettings = { ...defaultUserSettings };
  const bool = (k: keyof UserSettings) => {
    if (typeof data[k] === 'boolean') (out as unknown as Record<string, unknown>)[k] = data[k];
  };
  const time = (k: 'reminderTime' | 'quietHoursStart' | 'quietHoursEnd') => {
    if (isTime(data[k])) out[k] = data[k];
  };
  bool('remindersEnabled');
  bool('remindChecklist');
  bool('remindPackTonight');
  bool('remindFlight');
  bool('remindAnniversary');
  time('reminderTime');
  time('quietHoursStart');
  time('quietHoursEnd');
  if (data.distanceUnit === 'km' || data.distanceUnit === 'mi')
    out.distanceUnit = data.distanceUnit;
  if (data.temperatureUnit === 'C' || data.temperatureUnit === 'F')
    out.temperatureUnit = data.temperatureUnit;
  if (data.defaultPlaceScope === 'shared' || data.defaultPlaceScope === 'personal')
    out.defaultPlaceScope = data.defaultPlaceScope;
  return out;
}

/** Times offered in the pickers: every 30 minutes, "00:00" to "23:30". Selection over typing. */
export const timeChoices: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  return `${h}:${i % 2 ? '30' : '00'}`;
});

/** Quiet hours are off when start and end are the same time. */
export function quietHoursOff(s: Pick<UserSettings, 'quietHoursStart' | 'quietHoursEnd'>): boolean {
  return s.quietHoursStart === s.quietHoursEnd;
}
