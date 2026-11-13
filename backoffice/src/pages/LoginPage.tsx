import QRCode from 'qrcode';
import { useEffect, useState, type FormEvent } from 'react';

import { api, errorCode, errorText } from '@/api/client';
import type { components } from '@/api/schema';
import { useAuth } from '@/auth/AuthProvider';
import { Banner, Button, Field } from '@/components';

type LoginAnswer = components['schemas']['AdminLoginResponse'];

/**
 * Back office login: email + password (the account's own), then the 6-digit code from an authenticator app.
 * The very first time, the page shows a QR code and the key to add to the app.
 * Tap budget: type email, password, Log in; type code, Continue.
 */
export function LoginPage() {
  const { signIn, endedBecause } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<LoginAnswer | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!step?.otpauthUri) return setQr(null);
    // The QR code is drawn here in the browser; the key never goes to another service.
    QRCode.toDataURL(step.otpauthUri, { margin: 0, width: 360, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(null));
  }, [step]);

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await api.POST('/admin/auth/login', { body: { email, password } });
      if (data) {
        setPassword('');
        setStep(data);
      } else setError(errorText(err));
    } catch {
      setError('Cannot reach the server. Check your connection, or that the API is running.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!step) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await api.POST('/admin/auth/verify', { body: { challenge: step.challenge, code } });
      if (data) {
        signIn({ token: data.accessToken, expiresAt: data.expiresAt, me: data.me });
      } else {
        setCode('');
        if (errorCode(err) === 'invalid_token') setStep(null);
        setError(errorText(err));
      }
    } catch {
      setError('Cannot reach the server. Check your connection, or that the API is running.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth">
        <div style={{ display: 'grid', gap: 4 }}>
          <span className="mono">Travel App</span>
          <h1 className="d1">Back office</h1>
        </div>
        {endedBecause === 'expired' && !step ? (
          <Banner title="You were logged out">Back office sessions last 30 minutes. Nothing was lost; log in again.</Banner>
        ) : null}
        {error ? <Banner tone="err">{error}</Banner> : null}

        {!step ? (
          <form className="card" onSubmit={submitPassword}>
            <p className="h2">Log in with your app account</p>
            <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" block disabled={busy || !email || !password}>
              {busy ? 'Checking…' : 'Log in'}
            </Button>
          </form>
        ) : (
          <form className="card" onSubmit={submitCode}>
            {step.kind === 'setupRequired' ? (
              <>
                <p className="h2">Set up your authenticator app</p>
                <p className="cap">
                  Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password). Then type the
                  6-digit code it shows. You only do this once.
                </p>
                {qr ? (
                  <div className="qr">
                    <img src={qr} alt="QR code for your authenticator app" />
                  </div>
                ) : null}
                <div className="field">
                  <span className="mono">Or type this key</span>
                  <div className="secret">{step.secret?.replace(/(.{4})/g, '$1 ').trim()}</div>
                </div>
              </>
            ) : (
              <>
                <p className="h2">Code from your authenticator app</p>
                <p className="cap">Open the app and type the 6-digit code for Travel App admin.</p>
              </>
            )}
            <Field
              label="6-digit code"
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <Button type="submit" block disabled={busy || code.length !== 6}>
              {busy ? 'Checking…' : 'Continue'}
            </Button>
            <Button variant="ghost" small onClick={() => (setStep(null), setCode(''), setError(null))}>
              Start again
            </Button>
          </form>
        )}
        <p className="hint">Every action in the back office is written to the audit log.</p>
      </div>
    </div>
  );
}
