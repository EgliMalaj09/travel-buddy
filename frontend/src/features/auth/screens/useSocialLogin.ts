import { useState } from 'react';

import { useAuth } from '../AuthProvider';
import { AuthError } from '../types';
import { authErrorMessage } from '../ui/errors';

/**
 * Apple / Google login. In mock mode they log in as apple.user@example.com / google.user@example.com.
 * With the real API they open the phone's Google / Apple sheet (socialSignIn.ts) and send the
 * ID token to POST /auth/google or /auth/apple. Closing the sheet shows no error.
 */
export function useSocialLogin(setError: (message: string | null) => void) {
  const { loginWithApple, loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const run = (fn: () => Promise<void>) => async () => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if (e instanceof AuthError && e.code === 'cancelled') return;
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, onApple: run(loginWithApple), onGoogle: run(loginWithGoogle) };
}
