import { authApi } from '@/api/client';
import type { components } from '@/api/schema';

import type { AuthService } from './authService';
import { socialSheets as defaultSheets, type SocialSheets } from './socialSignIn';
import { AuthError, type AuthErrorCode, type AuthUser, type Session } from './types';

type Schemas = components['schemas'];

/**
 * The real login (KAN-12): calls the backend's /auth and /me endpoints through openapi-fetch.
 * In development the API writes the 6-digit codes to its log instead of sending emails (A6).
 */

const knownCodes: readonly AuthErrorCode[] = [
  'invalid_credentials',
  'invalid_code',
  'email_taken',
  'too_many_attempts',
  'session_expired',
  'password_leaked',
  'invalid_token',
  'consent_required',
  'account_deleted',
  'account_suspended',
  'not_deleted',
];

const fallbackMessages: Record<number, string> = {
  400: 'Check what you typed and try again.',
  401: 'Please log in again.',
  403: 'This account is suspended. Contact support.',
  409: 'This email already has an account. Log in instead.',
  429: 'Too many tries. Wait a little and try again.',
};

/** Turns a ProblemDetails answer from the API into an AuthError the screens can show. */
export function toAuthError(status: number, body: unknown): AuthError {
  const problem = (body ?? {}) as { code?: unknown; title?: unknown; errors?: unknown };
  const code =
    typeof problem.code === 'string' && knownCodes.includes(problem.code as AuthErrorCode)
      ? (problem.code as AuthErrorCode)
      : status === 429
        ? 'too_many_attempts'
        : status === 401
          ? 'session_expired'
          : 'invalid_input';
  // Auth errors carry a short, friendly title; validation errors (400) do not.
  const message =
    typeof problem.code === 'string' && typeof problem.title === 'string'
      ? problem.title
      : (fallbackMessages[status] ?? 'Something went wrong. Try again.');
  return new AuthError(code, message);
}

function networkError(): AuthError {
  return new AuthError(
    'network',
    'Cannot reach the server. Check your connection, or that the API is running.',
  );
}

/** Runs one call; turns failed answers and network errors into AuthError. */
async function call<T>(
  request: () => Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result: Awaited<ReturnType<typeof request>>;
  try {
    result = await request();
  } catch {
    throw networkError();
  }
  if (!result.response.ok) throw toAuthError(result.response.status, result.error);
  return result.data as T;
}

export function toAuthUser(u: Schemas['AuthUserResponse']): AuthUser {
  return {
    id: u.id,
    email: u.email,
    authProviders: u.authProviders.filter(
      (p): p is AuthUser['authProviders'][number] =>
        p === 'email' || p === 'google' || p === 'apple',
    ),
    profile: u.profile ?? null,
    suggestedFirstName: u.suggestedFirstName ?? undefined,
    consents: u.consents ?? null,
    deletion: u.deletion ?? null,
  };
}

export function toSession(s: Schemas['SessionResponse']): Session {
  return { accessToken: s.accessToken, refreshToken: s.refreshToken, user: toAuthUser(s.user) };
}

function phoneTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export function createApiAuthService(sheets: SocialSheets = defaultSheets): AuthService {
  return {
    async signUp(email, password, consents) {
      await call(() => authApi.POST('/auth/signup', { body: { email, password, consents } }));
    },

    async verifySignUp(email, code, deviceId) {
      return toSession(
        await call(() => authApi.POST('/auth/signup/verify', { body: { email, code, deviceId } })),
      );
    },

    async login(email, password, deviceId) {
      const result = await call(() =>
        authApi.POST('/auth/login', { body: { email, password, deviceId } }),
      );
      if (result.kind === 'session' && result.session) {
        return { kind: 'session', session: toSession(result.session) };
      }
      return { kind: 'codeRequired' };
    },

    async verifyLogin(email, code, deviceId) {
      return toSession(
        await call(() => authApi.POST('/auth/login/verify', { body: { email, code, deviceId } })),
      );
    },

    // The phone's Google / Apple sheet gives an ID token; the API checks it and starts a session.
    async loginWithGoogle(deviceId) {
      const { idToken, firstName } = await sheets.google();
      return toSession(
        await call(() =>
          authApi.POST('/auth/google', {
            body: { idToken, deviceId, firstName: firstName ?? null },
          }),
        ),
      );
    },

    async loginWithApple(deviceId) {
      const { idToken, firstName, nonce } = await sheets.apple();
      return toSession(
        await call(() =>
          authApi.POST('/auth/apple', {
            body: { idToken, deviceId, firstName: firstName ?? null, nonce: nonce ?? null },
          }),
        ),
      );
    },

    async resendCode(email, purpose) {
      await call(() => authApi.POST('/auth/code/resend', { body: { email, purpose } }));
    },

    async forgotPassword(email) {
      await call(() => authApi.POST('/auth/password/forgot', { body: { email } }));
    },

    async resetPassword(email, code, newPassword) {
      await call(() =>
        authApi.POST('/auth/password/reset', { body: { email, code, newPassword } }),
      );
    },

    async refresh(refreshToken) {
      return toSession(await call(() => authApi.POST('/auth/refresh', { body: { refreshToken } })));
    },

    async saveProfile(accessToken, profile, consents) {
      const user = await call(() =>
        authApi.POST('/me/profile', {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { ...profile, consents: consents ?? null, timeZone: phoneTimeZone() ?? null },
        }),
      );
      return toAuthUser(user);
    },

    async logout(refreshToken) {
      await sheets.signOut();
      await call(() => authApi.POST('/auth/logout', { body: { refreshToken } }));
    },

    async deleteAccount(accessToken) {
      const user = await call(() =>
        authApi.POST('/me/delete', {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { confirm: 'DELETE' },
        }),
      );
      await sheets.signOut().catch(() => undefined);
      return toAuthUser(user);
    },

    async restoreAccount(accessToken) {
      return toAuthUser(
        await call(() =>
          authApi.POST('/me/restore', { headers: { Authorization: `Bearer ${accessToken}` } }),
        ),
      );
    },
  };
}
