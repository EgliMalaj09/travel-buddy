import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { AppText, Button, CodeInput } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

import { useAuth } from '../AuthProvider';
import { AuthLayout, FormError, MockCodeHint } from '../ui/AuthLayout';
import { authErrorMessage } from '../ui/errors';
import { codeSchema } from '../validation';

const RESEND_SECONDS = 60; // at most 1 code per minute (A5)

/** 6-digit email code: after email sign-up, or when logging in on a new phone. */
export function VerifyCodeScreen() {
  const { colors } = useTheme();
  const { email = '', purpose = 'signup' } = useLocalSearchParams<{
    email: string;
    purpose: 'signup' | 'login';
  }>();
  const { verifySignUp, verifyLogin, resendCode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (value: string) => {
    if (!codeSchema.safeParse(value).success) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // On success the app moves on by itself (profile setup or Home).
      await (purpose === 'login' ? verifyLogin(email, value) : verifySignUp(email, value));
    } catch (e) {
      setError(authErrorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const onChange = (value: string) => {
    setCode(value);
    if (value.length === 6) void submit(value);
  };

  const resend = async () => {
    setError(null);
    try {
      await resendCode(email, purpose);
    } catch (e) {
      setError(authErrorMessage(e));
    }
    setWait(RESEND_SECONDS);
  };

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <AppText variant="label">{email}</AppText>. It is valid for 10
          minutes.
          {purpose === 'login' ? ' This is a new phone, so we check it is really you.' : ''}
        </>
      }
      footer={
        <Button
          title={busy ? 'Checking…' : 'Confirm'}
          onPress={() => submit(code)}
          disabled={busy}
        />
      }
    >
      <CodeInput value={code} onChange={onChange} error={error ? ' ' : undefined} />
      <FormError message={error} />
      <MockCodeHint />
      <Pressable
        accessibilityRole="button"
        disabled={wait > 0}
        onPress={resend}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <AppText variant="label" color={wait > 0 ? colors.inkSoft : colors.accent}>
          {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
        </AppText>
      </Pressable>
    </AuthLayout>
  );
}
