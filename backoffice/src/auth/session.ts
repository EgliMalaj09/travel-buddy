import type { components } from '@/api/schema';

export type AdminMe = components['schemas']['AdminMeDto'];
export type AdminSession = { token: string; expiresAt: string; me: AdminMe };

/**
 * The back office token lives in sessionStorage: it is gone when the tab closes, and it lasts at most
 * 30 minutes anyway. Never localStorage (it would stay on a shared computer). Nothing else is stored.
 */
const KEY = 'travelapp.admin.session';

export function readSession(now = Date.now()): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    return Date.parse(session.expiresAt) > now ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Private mode: the session lives in memory only (the AuthProvider keeps it).
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
