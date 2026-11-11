import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './schema';

/**
 * Typed API client (A11: openapi-fetch). Types come from backend/openapi/openapi.json:
 * run `npm run api:types` after the backend changes its API.
 * Screens never call this directly: repositories and services do.
 */
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5001';

export const api = createClient<paths>({ baseUrl: apiBaseUrl });

/** Set by the auth layer: returns the current access token, refreshing it when needed. */
type TokenProvider = {
  getAccessToken: () => Promise<string | null>;
  refresh: () => Promise<string | null>;
};
let tokens: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider | null) {
  tokens = provider;
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
