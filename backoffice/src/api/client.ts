import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './schema';

/**
 * Typed API client (openapi-fetch, same as the phone app). Types come from backend/openapi/openapi.json:
 * run `npm run api:types` after the backend changes its API.
 */
export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5001').replace(/\/+$/, '');

let token: string | null = null;
let onExpired: (() => void) | null = null;

/** Set by the AuthProvider: the token to send, and what to do when the API says it is no longer valid. */
export function setAuth(next: string | null, expired: (() => void) | null) {
  token = next;
  onExpired = expired;
}

const auth: Middleware = {
  onRequest({ request }) {
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
  onResponse({ response, request }) {
    if (response.status === 401 && token && !new URL(request.url).pathname.startsWith('/admin/auth/')) onExpired?.();
    return response;
  },
};

// fetch is looked up on every call, so tests can replace it.
export const api = createClient<paths>({ baseUrl: apiBaseUrl, fetch: (r: Request) => globalThis.fetch(r) });
api.use(auth);

/** The short, friendly title of an API error (ProblemDetails), or a fallback. */
export function errorText(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  const e = error as { title?: unknown; errors?: unknown } | undefined;
  if (e && typeof e.title === 'string' && !e.errors) return e.title;
  if (e && e.errors) return 'Check what you typed and try again.';
  return fallback;
}

/** Error code from a ProblemDetails answer ("invalid_code", "conflict", ...). */
export function errorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? code : undefined;
}
