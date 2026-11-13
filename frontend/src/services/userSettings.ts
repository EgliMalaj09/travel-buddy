import { create } from 'zustand';

import { settingsRepository, subscribeDataChanged } from '@/data';
import { defaultUserSettings, parseUserSettings, type UserSettings } from '@/lib/settings';
import { useUiStore } from '@/store/uiStore';

import { getDeviceValue, removeDeviceValue, setDeviceValue } from './deviceStorage';

/**
 * The logged-in user's settings (UserSettings, data model section 4), set on the Settings screen
 * (KAN-21) and saved on the server (KAN-22).
 *
 * - The source of truth is the account's `user_settings` row in the phone's database, which
 *   PowerSync syncs with the server: every phone of the user gets the same settings, and a change
 *   made offline is sent when the phone is back online.
 * - A copy is kept in MMKV per account, so reminders can be planned at once on app start (before
 *   the database is open) and so the web preview / mock mode, which have no local database, work.
 * - Settings made before KAN-22 lived only in MMKV. If this account has no row yet and was never
 *   synced on this phone, that copy is saved as the row once (so the user keeps their choices).
 */
const key = (userId: string) => `userSettings.${userId}`;
const syncedKey = (userId: string) => `userSettings.${userId}.synced`;

interface UserSettingsState {
  owner: string | null;
  settings: UserSettings;
  /** Loads the settings of the logged-in user (null = nobody: back to the defaults). */
  load: (userId: string | null) => void;
  update: (patch: Partial<UserSettings>) => void;
}

let unsubscribe: (() => void) | null = null;
/** True once PowerSync finished a download for the current owner (not just the start value). */
let downloaded = false;

export const useUserSettings = create<UserSettingsState>((set, get) => {
  /** Takes the row from the database when it is there (downloaded or saved). */
  const refresh = async (owner: string) => {
    if (!settingsRepository) return;
    let row: UserSettings | null = null;
    try {
      row = await settingsRepository.read(owner);
    } catch {
      return; // The database is busy switching owner; the next change tries again.
    }
    if (get().owner !== owner) return;
    if (row) {
      setDeviceValue(syncedKey(owner), '1');
      setDeviceValue(key(owner), JSON.stringify(row));
      if (JSON.stringify(row) !== JSON.stringify(get().settings)) set({ settings: row });
      return;
    }
    // No row yet: save the phone-only copy from before KAN-22, once. Only after the first download
    // has finished, so a row made on another phone is never overwritten by this old copy.
    const legacy = getDeviceValue(key(owner));
    if (legacy && !getDeviceValue(syncedKey(owner)) && downloaded) {
      setDeviceValue(syncedKey(owner), '1');
      await settingsRepository.save(owner, parseUserSettings(legacy)).catch(() => undefined);
    }
  };

  return {
    owner: null,
    settings: defaultUserSettings,
    load: (owner) => {
      if (owner === get().owner) return;
      unsubscribe?.();
      unsubscribe = null;
      downloaded = false;
      set({
        owner,
        settings: owner ? parseUserSettings(getDeviceValue(key(owner))) : defaultUserSettings,
      });
      if (owner && settingsRepository) {
        // Another phone changed a setting: PowerSync writes the row and this picks it up.
        const offData = subscribeDataChanged(() => void refresh(owner));
        const offSync = useUiStore.subscribe((state, before) => {
          if (state.syncStatus === 'synced' && before.syncStatus !== 'synced') {
            downloaded = true;
            void refresh(owner);
          }
        });
        unsubscribe = () => {
          offData();
          offSync();
        };
        void refresh(owner);
      }
    },
    update: (patch) => {
      const { owner, settings } = get();
      const next = { ...settings, ...patch };
      if (owner) {
        setDeviceValue(key(owner), JSON.stringify(next));
        setDeviceValue(syncedKey(owner), '1');
        void settingsRepository?.save(owner, next).catch(() => undefined);
      }
      set({ settings: next });
    },
  };
});

/** The current settings, for code outside React (reminder planning). */
export function currentUserSettings(): UserSettings {
  return useUserSettings.getState().settings;
}

/** Forgets this account's settings copy on the phone (account deleted, KAN-22). */
export function forgetUserSettings(userId: string): void {
  removeDeviceValue(key(userId));
  removeDeviceValue(syncedKey(userId));
}
