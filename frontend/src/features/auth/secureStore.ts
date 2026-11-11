import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Login secrets live in the phone's secure storage (iPhone Keychain / Android Keystore),
 * never in MMKV (decisions/tech-stack.md).
 */
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
