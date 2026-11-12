import { createMMKV } from 'react-native-mmkv';

/**
 * Small values that belong to this phone only (DeviceSettings in the data model, plus flags).
 * Stored with MMKV (decisions/tech-stack.md). Never put trip data or tokens here:
 * trip data → local database, tokens → expo-secure-store.
 */
const storage = createMMKV({ id: 'travelapp.device' });

export interface DeviceSettings {
  uploadOnWifiOnly: boolean;
  theme: 'system' | 'light' | 'night';
  autoCaptureEnabled: boolean;
  analyticsConsent: boolean;
  /** Face ID / fingerprint to open the app (A8). */
  biometricUnlock: boolean;
}

const defaults: DeviceSettings = {
  uploadOnWifiOnly: true,
  theme: 'system',
  autoCaptureEnabled: false,
  analyticsConsent: false,
  biometricUnlock: false,
};

const KEY = 'deviceSettings';

export function getDeviceSettings(): DeviceSettings {
  const raw = storage.getString(KEY);
  if (!raw) return defaults;
  try {
    return { ...defaults, ...(JSON.parse(raw) as Partial<DeviceSettings>) };
  } catch {
    return defaults;
  }
}

export function setDeviceSettings(patch: Partial<DeviceSettings>): DeviceSettings {
  const next = { ...getDeviceSettings(), ...patch };
  storage.set(KEY, JSON.stringify(next));
  return next;
}

export function getFlag(name: string): boolean {
  return storage.getBoolean(`flag.${name}`) ?? false;
}

export function setFlag(name: string, value: boolean): void {
  storage.set(`flag.${name}`, value);
}

/** A short text value for this phone (for example the user whose trips the local database holds). */
export function getDeviceValue(name: string): string | null {
  return storage.getString(`value.${name}`) ?? null;
}

export function setDeviceValue(name: string, value: string): void {
  storage.set(`value.${name}`, value);
}
