import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setAuth } from '@/api/client';
import { roleAtLeast, type Role } from '@/lib/roles';

import { clearSession, readSession, saveSession, type AdminSession } from './session';

/** Why a session ended: its 30 minutes were over, or an owner removed you (the API refused a still-valid token). */
export type EndReason = 'expired' | 'removed';

type AuthState = {
  session: AdminSession | null;
  signIn: (session: AdminSession) => void;
  signOut: (reason?: EndReason) => void;
  /** Why the last session ended, shown on the login page. */
  endedBecause: EndReason | null;
  can: (role: Role) => boolean;
};

/** How often the menu re-checks your role with the API, so an owner's change shows without logging in again. */
export const ROLE_CHECK_MS = 60_000;

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(() => readSession());
  const [endedBecause, setEndedBecause] = useState<EndReason | null>(null);

  const signOut = useCallback((reason?: EndReason) => {
    clearSession();
    setSession(null);
    setEndedBecause(reason ?? null);
  }, []);

  const signIn = useCallback((next: AdminSession) => {
    saveSession(next);
    setEndedBecause(null);
    setSession(next);
  }, []);

  // Ask the API who you are now. An owner can change your role at any time: the API applies it at once,
  // and this keeps the menu in step. Only the role is taken from the answer.
  const refreshRole = useCallback(async () => {
    const current = readSession();
    if (!current) return;
    const { data } = await api.GET('/admin/me');
    if (!data || data.role === current.me.role) return;
    const next = { ...current, me: { ...current.me, role: data.role } };
    saveSession(next);
    setSession(next);
  }, []);

  // Give the API client the token. A 401 means the token is no longer valid: its 30 minutes are over, or
  // an owner removed you from the team (the token itself was still valid). A 403 means your role may
  // have been lowered, so the menu checks it again.
  if (session) {
    setAuth(
      session.token,
      () => signOut(Date.parse(session.expiresAt) - Date.now() > 5_000 ? 'removed' : 'expired'),
      () => void refreshRole(),
    );
  } else setAuth(null, null);

  const signedIn = !!session;
  useEffect(() => {
    if (!signedIn) return;
    const check = () => void refreshRole();
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const timer = window.setInterval(check, ROLE_CHECK_MS);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn, refreshRole]);

  useEffect(() => {
    if (!session) return;
    const ms = Date.parse(session.expiresAt) - Date.now();
    const timer = window.setTimeout(() => signOut('expired'), Math.max(0, ms));
    return () => window.clearTimeout(timer);
  }, [session, signOut]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      signIn,
      signOut,
      endedBecause,
      can: (role) => !!session && roleAtLeast(session.me.role, role),
    }),
    [session, signIn, signOut, endedBecause],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth needs <AuthProvider>');
  return value;
}
