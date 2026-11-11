import * as Crypto from 'expo-crypto';
import * as Store from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Login secrets live in the phone's secure storage (iPhone Keychain / Android Keystore),
 * never in MMKV (decisions/tech-stack.md).
 */
// Secure storage does not exist in a web browser. The web build is only for previewing
// screens, so there we fall back to localStorage. Phones always use the secure store.
const SecureStore =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
        setItemAsync: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v),
        deleteItemAsync: async (k: string) => globalThis.localStorage?.removeItem(k),
      }
    : Store;

const REFRESH_TOKEN = 'travelapp.refreshToken';
const DEVICE_ID = 'travelapp.deviceId';

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN);
}

export async function setRefreshToken(value: string | null): Promise<void> {
  if (value) await SecureStore.setItemAsync(REFRESH_TOKEN, value);
  else await SecureStore.deleteItemAsync(REFRESH_TOKEN);
}

/** Random id for this phone, created once. Used to remember trusted phones (no code needed). */
export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID, id);
  return id;
}
