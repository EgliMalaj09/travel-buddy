import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setAuth } from '@/api/client';
import { roleAtLeast, type Role } from '@/lib/roles';

import { clearSession, readSession, saveSession, type AdminSession } from './session';

type AuthState = {
  session: AdminSession | null;
  signIn: (session: AdminSession) => void;
  signOut: (reason?: 'expired') => void;
  /** Why the last session ended, shown on the login page. */
  endedBecause: 'expired' | null;
  can: (role: Role) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(() => readSession());
  const [endedBecause, setEndedBecause] = useState<'expired' | null>(null);

  const signOut = useCallback((reason?: 'expired') => {
    clearSession();
    setSession(null);
    setEndedBecause(reason ?? null);
  }, []);

  const signIn = useCallback((next: AdminSession) => {
    saveSession(next);
    setEndedBecause(null);
    setSession(next);
  }, []);

  // Give the API client the token, and log out when it is no longer valid (30 minutes, or removed from the team).
  if (session) setAuth(session.token, () => signOut('expired'));
  else setAuth(null, null);

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
