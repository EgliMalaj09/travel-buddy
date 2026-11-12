import createClient, { type Middleware } from 'openapi-fetch';
import { Platform } from 'react-native';

import type { paths } from './schema';

/**
 * Typed API client (A11: openapi-fetch). Types come from backend/openapi/openapi.json:
 * run `npm run api:types` after the backend changes its API.
 * Screens never call this directly: repositories and services do.
 */

/**
 * Where the API runs. EXPO_PUBLIC_API_URL wins when set (for example a real phone on Wi-Fi:
 * http://192.168.1.20:5001). Otherwise the local API on this computer: the Android emulator
 * reaches the computer at 10.0.2.2; the web build and the iOS simulator use localhost.
 */
export function defaultApiBaseUrl(
  os: string = Platform.OS,
  envUrl = process.env.EXPO_PUBLIC_API_URL,
) {
  if (envUrl) return envUrl.replace(/\/+$/, '');
  return os === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001';
}

export const apiBaseUrl = defaultApiBaseUrl();

// fetch is looked up on every call (not once at start), so tests can replace it.
const fetchNow = (request: Request) => globalThis.fetch(request);

export const api = createClient<paths>({ baseUrl: apiBaseUrl, fetch: fetchNow });

/**
 * Client for /auth calls. It has no token middleware: a 401 there means "wrong password"
 * or "session expired", not "refresh and retry".
 */
export const authApi = createClient<paths>({ baseUrl: apiBaseUrl, fetch: fetchNow });

/** Set by the auth layer: returns the current access token, refreshing it when needed. */
type TokenProvider = {
  getAccessToken: () => Promise<string | null>;
  refresh: () => Promise<string | null>;
};
let tokens: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider | null) {
  tokens = provider;
}

/** The current access token (refreshed when needed), or null when logged out. Used by PowerSync. */
export function currentAccessToken(): Promise<string | null> {
  return tokens?.getAccessToken() ?? Promise.resolve(null);
}

/**
 * Where PowerSync (the sync service) runs. EXPO_PUBLIC_POWERSYNC_URL wins when set (a real phone
 * on Wi-Fi: http://192.168.1.20:8080). Otherwise port 8080 on this computer, like the API.
 */
export function defaultPowerSyncUrl(
  os: string = Platform.OS,
  envUrl = process.env.EXPO_PUBLIC_POWERSYNC_URL,
) {
  if (envUrl) return envUrl.replace(/\/+$/, '');
  return os === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
}

/** Adds "Authorization: Bearer …" to every call and retries once with a fresh token after a 401. */
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const accessToken = await tokens?.getAccessToken();
    if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`);
    return request;
  },
  async onResponse({ request, response }) {
    if (response.status !== 401 || !tokens || request.headers.get('X-Retried')) return response;
    const fresh = await tokens.refresh();
    if (!fresh) return response;
    const retry = new Request(request, { headers: new Headers(request.headers) });
    retry.headers.set('Authorization', `Bearer ${fresh}`);
    retry.headers.set('X-Retried', '1');
    return fetch(retry);
  },
};

api.use(authMiddleware);
