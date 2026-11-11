import { createMMKV } from 'react-native-mmkv';

import type { AuthService } from './authService';
import { AuthError, type AuthUser, type Consents, type Session } from './types';

/**
 * Mock login for building screens before the backend runs (A14).
 * - Any email works. Passwords must be at least 10 characters.
 * - Every code is 123456.
 * - Users and trusted phones are kept on this phone (MMKV) so sign-up survives an app restart.
 * Replaced by the real API service in mock-free builds (switch list in decisions/releases.md).
 */
export const MOCK_CODE = '123456';

interface MockUser extends AuthUser {
  password: string | null;
  trustedDevices: string[];
}

interface MockDb {
  users: MockUser[];
  pendingSignups: { email: string; password: string; consents: Consents }[];
  sessions: Record<string, string>; // refreshToken -> userId
  accessTokens?: Record<string, string>; // accessToken -> userId
}

const storage = createMMKV({ id: 'travelapp.mock-auth' });
const KEY = 'db';

function load(): MockDb {
  const raw = storage.getString(KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as MockDb;
    } catch {
      // fall through to empty db
    }
  }
  return { users: [], pendingSignups: [], sessions: {} };
}

function save(db: MockDb) {
  storage.set(KEY, JSON.stringify(db));
}

function token(prefix: string) {
  return `${prefix}.${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function publicUser(u: MockUser): AuthUser {
  const { password: _password, trustedDevices: _trusted, ...user } = u;
  return user;
}

function newSession(db: MockDb, user: MockUser): Session {
  const refreshToken = token('mock-refresh');
  const accessToken = token('mock-access');
  db.sessions[refreshToken] = user.id;
  db.accessTokens = { ...db.accessTokens, [accessToken]: user.id };
  return { accessToken, refreshToken, user: publicUser(user) };
}

function normalise(email: string) {
  return email.trim().toLowerCase();
}

const delay = () => new Promise((r) => setTimeout(r, 300));

function socialUser(db: MockDb, provider: 'google' | 'apple'): MockUser {
  const email = `${provider}.user@example.com`;
  let user = db.users.find((u) => u.email === email);
  if (!user) {
    user = {
      id: token('user'),
      email,
      authProviders: [provider],
      profile: null,
      consents: null,
      suggestedFirstName: provider === 'google' ? 'Alex' : undefined,
      password: null,
      trustedDevices: [],
    };
    db.users.push(user);
  } else if (!user.authProviders.includes(provider)) {
    user.authProviders.push(provider);
  }
  return user;
}

export function createMockAuthService(): AuthService {
  return {
    async signUp(email, password, consents) {
      await delay();
      const db = load();
      const e = normalise(email);
      if (db.users.some((u) => u.email === e && u.password)) {
        throw new AuthError('email_taken', 'This email already has an account. Log in instead.');
      }
      db.pendingSignups = db.pendingSignups.filter((p) => p.email !== e);
      db.pendingSignups.push({ email: e, password, consents });
      save(db);
      console.info(`[mock auth] Sign-up code for ${e}: ${MOCK_CODE}`);
    },

    async verifySignUp(email, code, deviceId) {
      await delay();
      if (code !== MOCK_CODE) throw new AuthError('invalid_code', 'That code is not right.');
      const db = load();
      const e = normalise(email);
      const pending = db.pendingSignups.find((p) => p.email === e);
      if (!pending) throw new AuthError('invalid_code', 'The code has expired. Sign up again.');
      let user = db.users.find((u) => u.email === e);
      if (user) {
        // Same email as a Google/Apple account: link them (L3).
        user.password = pending.password;
        user.authProviders = [...new Set([...user.authProviders, 'email' as const])];
        user.consents = pending.consents;
      } else {
        user = {
          id: token('user'),
          email: e,
          authProviders: ['email'],
          profile: null,
          consents: pending.consents,
          password: pending.password,
          trustedDevices: [],
        };
        db.users.push(user);
      }
      user.trustedDevices.push(deviceId);
      db.pendingSignups = db.pendingSignups.filter((p) => p.email !== e);
      const session = newSession(db, user);
      save(db);
      return session;
    },

    async login(email, password, deviceId) {
      await delay();
      const db = load();
      const user = db.users.find((u) => u.email === normalise(email));
      if (!user || !user.password || user.password !== password) {
        throw new AuthError('invalid_credentials', 'Email or password is not right.');
      }
      if (!user.trustedDevices.includes(deviceId)) {
        console.info(`[mock auth] New-phone code for ${user.email}: ${MOCK_CODE}`);
        return { kind: 'codeRequired' };
      }
      const session = newSession(db, user);
      save(db);
      return { kind: 'session', session };
    },

    async verifyLogin(email, code, deviceId) {
      await delay();
      if (code !== MOCK_CODE) throw new AuthError('invalid_code', 'That code is not right.');
      const db = load();
      const user = db.users.find((u) => u.email === normalise(email));
      if (!user) throw new AuthError('invalid_credentials', 'Email or password is not right.');
      if (!user.trustedDevices.includes(deviceId)) user.trustedDevices.push(deviceId);
      const session = newSession(db, user);
      save(db);
      return session;
    },

    async loginWithGoogle() {
      await delay();
      const db = load();
      const session = newSession(db, socialUser(db, 'google'));
      save(db);
      return session;
    },

    async loginWithApple() {
      await delay();
      const db = load();
      const session = newSession(db, socialUser(db, 'apple'));
      save(db);
      return session;
    },

    async resendCode(email, purpose) {
      await delay();
      console.info(`[mock auth] New ${purpose} code for ${normalise(email)}: ${MOCK_CODE}`);
    },

    async forgotPassword(email) {
      await delay();
      // Same answer whether or not the account exists (no account guessing).
      console.info(`[mock auth] Password reset code for ${normalise(email)}: ${MOCK_CODE}`);
    },

    async resetPassword(email, code, newPassword) {
      await delay();
      if (code !== MOCK_CODE) throw new AuthError('invalid_code', 'That code is not right.');
      const db = load();
      const user = db.users.find((u) => u.email === normalise(email));
      if (user) {
        user.password = newPassword;
        user.authProviders = [...new Set([...user.authProviders, 'email' as const])];
        save(db);
      }
    },

    async refresh(refreshToken) {
      await delay();
      const db = load();
      const userId = db.sessions[refreshToken];
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new AuthError('session_expired', 'Please log in again.');
      delete db.sessions[refreshToken];
      const session = newSession(db, user);
      save(db);
      return session;
    },

    async saveProfile(accessToken, profile, consents) {
      await delay();
      const db = load();
      const user = db.users.find((u) => u.id === db.accessTokens?.[accessToken]);
      if (!user) throw new AuthError('session_expired', 'Please log in again.');
      user.profile = profile;
      if (consents) user.consents = consents;
      save(db);
      return publicUser(user);
    },

    async logout(refreshToken) {
      const db = load();
      delete db.sessions[refreshToken];
      save(db);
    },
  };
}

/** For tests: start from an empty mock database. */
export function resetMockAuth() {
  storage.remove(KEY);
}
