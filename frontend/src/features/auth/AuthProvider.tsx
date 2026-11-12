import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { setTokenProvider } from '@/api/client';
import { getDeviceSettings, getFlag, setDeviceSettings, setFlag } from '@/services/deviceStorage';

import type { AuthService } from './authService';
import { unlockWithBiometric } from './biometric';
import { createAuthService } from './authMode';
import { resetMockAuth } from './mockAuthService';
import { getDeviceId, getRefreshToken, setRefreshToken } from './secureStore';
import type { AuthUser, Consents, LoginResult, Profile, Session } from './types';

/**
 * The logged-in user, shared through React Context (agreed: Context for theme and user).
 * Routes are guarded in src/app/_layout.tsx from `phase`.
 */
export type AuthPhase =
  | 'loading' // reading the saved session
  | 'intro' // first open: show intro screens
  | 'signedOut' // login / sign-up screens
  | 'locked' // signed in, waiting for Face ID / fingerprint
  | 'needsProfile' // signed in, profile setup not done
  | 'signedIn';

interface AuthContextValue {
  phase: AuthPhase;
  user: AuthUser | null;
  finishIntro(): void;
  signUp(email: string, password: string, consents: Consents): Promise<void>;
  verifySignUp(email: string, code: string): Promise<void>;
  login(email: string, password: string): Promise<LoginResult['kind']>;
  verifyLogin(email: string, code: string): Promise<void>;
  loginWithGoogle(): Promise<void>;
  loginWithApple(): Promise<void>;
  resendCode(email: string, purpose: 'signup' | 'login'): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  saveProfile(profile: Profile, consents?: Consents): Promise<void>;
  /** Testing helper: log out, forget mock users on this phone and show the intro again. */
  resetForTesting(): Promise<void>;
  logout(): Promise<void>;
  unlock(): Promise<boolean>;
  biometricEnabled: boolean;
  setBiometricEnabled(enabled: boolean): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const INTRO_FLAG = 'introSeen';
export const BIOMETRIC_OFFERED_FLAG = 'biometricOffered';

export function AuthProvider({
  children,
  service,
}: {
  children: ReactNode;
  service?: AuthService;
}) {
  const auth = useMemo(() => service ?? createAuthService(), [service]);
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<AuthPhase>('loading');
  const [biometricEnabled, setBiometric] = useState(() => getDeviceSettings().biometricUnlock);
  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const phaseFor = useCallback((s: Session | null, locked = false): AuthPhase => {
    if (!s) return getFlag(INTRO_FLAG) ? 'signedOut' : 'intro';
    if (locked) return 'locked';
    return s.user.profile ? 'signedIn' : 'needsProfile';
  }, []);

  const applySession = useCallback(
    async (s: Session | null, locked = false) => {
      await setRefreshToken(s?.refreshToken ?? null);
      setSession(s);
      setPhase(phaseFor(s, locked));
    },
    [phaseFor],
  );

  // On app start: restore the saved session (stay logged in, A8).
  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await getRefreshToken();
      if (!saved) {
        if (active) setPhase(phaseFor(null));
        return;
      }
      try {
        const restored = await auth.refresh(saved);
        if (active) await applySession(restored, getDeviceSettings().biometricUnlock);
      } catch {
        if (active) await applySession(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [auth, applySession, phaseFor]);

  // Lets the API client add and refresh the access token.
  useEffect(() => {
    setTokenProvider({
      getAccessToken: async () => sessionRef.current?.accessToken ?? null,
      refresh: async () => {
        const current = sessionRef.current;
        if (!current) return null;
        try {
          const next = await auth.refresh(current.refreshToken);
          await setRefreshToken(next.refreshToken);
          setSession(next);
          return next.accessToken;
        } catch {
          await applySession(null);
          return null;
        }
      },
    });
    return () => setTokenProvider(null);
  }, [auth, applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      phase,
      user: session?.user ?? null,
      finishIntro() {
        setFlag(INTRO_FLAG, true);
        setPhase((p) => (p === 'intro' ? 'signedOut' : p));
      },
      signUp: (email, password, consents) => auth.signUp(email, password, consents),
      async verifySignUp(email, code) {
        await applySession(await auth.verifySignUp(email, code, await getDeviceId()));
      },
      async login(email, password) {
        const result = await auth.login(email, password, await getDeviceId());
        if (result.kind === 'session') await applySession(result.session);
        return result.kind;
      },
      async verifyLogin(email, code) {
        await applySession(await auth.verifyLogin(email, code, await getDeviceId()));
      },
      async loginWithGoogle() {
        await applySession(await auth.loginWithGoogle(await getDeviceId()));
      },
      async loginWithApple() {
        await applySession(await auth.loginWithApple(await getDeviceId()));
      },
      resendCode: (email, purpose) => auth.resendCode(email, purpose),
      forgotPassword: (email) => auth.forgotPassword(email),
      resetPassword: (email, code, newPassword) => auth.resetPassword(email, code, newPassword),
      async saveProfile(profile, consents) {
        const current = sessionRef.current;
        if (!current) return;
        const user = await auth.saveProfile(current.accessToken, profile, consents);
        const next = { ...current, user };
        setSession(next);
        setPhase(phaseFor(next));
      },
      async logout() {
        const current = sessionRef.current;
        if (current) await auth.logout(current.refreshToken).catch(() => undefined);
        await applySession(null);
      },
      async resetForTesting() {
        await applySession(null);
        resetMockAuth();
        setFlag(INTRO_FLAG, false);
        setFlag(BIOMETRIC_OFFERED_FLAG, false);
        setDeviceSettings({ biometricUnlock: false });
        setBiometric(false);
        setPhase('intro');
      },
      async unlock() {
        const ok = await unlockWithBiometric();
        if (ok) setPhase(phaseFor(sessionRef.current));
        return ok;
      },
      biometricEnabled,
      setBiometricEnabled(enabled) {
        setDeviceSettings({ biometricUnlock: enabled });
        setBiometric(enabled);
      },
    }),
    [auth, applySession, biometricEnabled, phase, phaseFor, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
