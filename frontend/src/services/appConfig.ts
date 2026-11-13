import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { authApi } from '@/api/client';
import type { components } from '@/api/schema';
import { isOlderThan } from '@/lib/appVersion';

import { getDeviceValue, setDeviceValue } from './deviceStorage';

export type AppConfig = components['schemas']['AppConfigDto'];

/**
 * App settings for every phone (AppConfig, data model section 6), set in the back office (KAN-55).
 * Read from GET /app-config (public, no login) when the app opens and comes back to the front;
 * the last copy is kept on the phone, so the app works the same offline. Nothing is logged.
 */
const CACHE = 'appConfig';

export function cachedAppConfig(): AppConfig | null {
  try {
    const raw = getDeviceValue(CACHE);
    return raw ? (JSON.parse(raw) as AppConfig) : null;
  } catch {
    return null;
  }
}

export type FetchAppConfig = () => Promise<AppConfig | null>;

const fetchFromApi: FetchAppConfig = async () => {
  try {
    const { data } = await authApi.GET('/app-config');
    return data ?? null;
  } catch {
    return null; // Offline or server down: keep the last copy.
  }
};

/** Asks the server and keeps the answer. Returns the newest copy the phone has. */
export async function refreshAppConfig(
  fetchConfig: FetchAppConfig = fetchFromApi,
): Promise<AppConfig | null> {
  const fresh = await fetchConfig();
  if (fresh) setDeviceValue(CACHE, JSON.stringify(fresh));
  return fresh ?? cachedAppConfig();
}

export const installedVersion = (): string | null => Constants.expoConfig?.version ?? null;

/** True when the back office says this app version is too old (the app then shows "Update the app"). */
export function updateRequired(config: AppConfig | null, version = installedVersion()): boolean {
  return isOlderThan(version, config?.minAppVersion);
}

/** Current settings and a way to ask again; also asks whenever the app comes back to the front. */
export function useAppConfig(): { config: AppConfig | null; recheck: () => void } {
  const [config, setConfig] = useState(cachedAppConfig);
  const recheck = useCallback(() => void refreshAppConfig().then(setConfig), []);
  useEffect(() => {
    recheck();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && recheck());
    return () => sub.remove();
  }, [recheck]);
  return { config, recheck };
}
