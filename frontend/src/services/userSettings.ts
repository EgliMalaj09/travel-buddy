import { create } from 'zustand';

import { defaultUserSettings, parseUserSettings, type UserSettings } from '@/lib/settings';

import { getDeviceValue, setDeviceValue } from './deviceStorage';

/**
 * The logged-in user's settings (UserSettings, data model section 4), set on the Settings screen
 * (KAN-21).
 *
 * For now they are kept on this phone only, one copy per account, so a second account on the same
 * phone has its own. The data model says UserSettings is synced; that waits for the server table
 * (KAN-22). When it exists this store reads and writes through a repository instead, and the
 * screens do not change.
 */
const key = (userId: string) => `userSettings.${userId}`;

interface UserSettingsState {
  owner: string | null;
  settings: UserSettings;
  /** Loads the settings of the logged-in user (null = nobody: back to the defaults). */
  load: (userId: string | null) => void;
  update: (patch: Partial<UserSettings>) => void;
}

export const useUserSettings = create<UserSettingsState>((set, get) => ({
  owner: null,
  settings: defaultUserSettings,
  load: (owner) => {
    if (owner === get().owner) return;
    set({
      owner,
      settings: owner ? parseUserSettings(getDeviceValue(key(owner))) : defaultUserSettings,
    });
  },
  update: (patch) => {
    const { owner, settings } = get();
    const next = { ...settings, ...patch };
    if (owner) setDeviceValue(key(owner), JSON.stringify(next));
    set({ settings: next });
  },
}));

/** The current settings, for code outside React (reminder planning). */
export function currentUserSettings(): UserSettings {
  return useUserSettings.getState().settings;
}
