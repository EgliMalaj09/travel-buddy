import { useState } from 'react';

import { useAuth } from '../AuthProvider';
import { authErrorMessage } from '../ui/errors';

/**
 * Apple / Google login. In mock mode they log in as apple.user@example.com / google.user@example.com.
 * With the real API they show "not connected yet" until the sign-in sheets (google-signin,
 * expo-apple-authentication) are added; the backend endpoints already exist (KAN-12).
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
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, onApple: run(loginWithApple), onGoogle: run(loginWithGoogle) };
}
