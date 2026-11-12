import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { getFlag, setFlag } from '@/services/deviceStorage';

import { AuthProvider, useAuth } from '../AuthProvider';
import type { AuthService } from '../authService';
import { MOCK_CODE, createMockAuthService, resetMockAuth } from '../mockAuthService';
import { AuthError } from '../types';

const secure: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => secure[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    secure[k] = v;
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    delete secure[k];
  }),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-device' }));
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: async () => false,
  isEnrolledAsync: async () => false,
  supportedAuthenticationTypesAsync: async () => [],
  authenticateAsync: async () => ({ success: true }),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2 },
}));

const holder: { current: ReturnType<typeof useAuth> | null } = { current: null };
const phases: string[] = [];
function Probe() {
  const value = useAuth();
  useEffect(() => {
    holder.current = value;
  });
  useEffect(() => {
    phases.push(value.phase);
  }, [value.phase]);
  return <Text>{value.phase}</Text>;
}
const auth = new Proxy({} as ReturnType<typeof useAuth>, {
  get: (_, key) => holder.current?.[key as keyof ReturnType<typeof useAuth>],
});

const renderApp = (service: AuthService = createMockAuthService()) =>
  render(
    <AuthProvider service={service}>
      <Probe />
    </AuthProvider>,
  );

const consents = { ageConfirmed: true, termsAccepted: true, marketingConsent: false };

describe('AuthProvider', () => {
  beforeEach(() => {
    resetMockAuth();
    setFlag('introSeen', false);
    for (const k of Object.keys(secure)) delete secure[k];
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('goes intro → sign up → profile → signed in, and stays logged in after a restart', async () => {
    const first = await renderApp();
    await waitFor(() => expect(screen.getByText('intro')).toBeTruthy());

    await act(async () => {
      auth.finishIntro();
    });
    expect(screen.getByText('signedOut')).toBeTruthy();
    expect(getFlag('introSeen')).toBe(true);

    await act(() => auth.signUp('ana@example.com', 'long enough pw', consents));
    await act(() => auth.verifySignUp('ana@example.com', MOCK_CODE));
    expect(screen.getByText('needsProfile')).toBeTruthy();

    await act(() =>
      auth.saveProfile({
        firstName: 'Ana',
        passportCountry: 'AL',
        residenceCountry: 'AL',
        homeCurrency: 'ALL',
      }),
    );
    expect(screen.getByText('signedIn')).toBeTruthy();
    await first.unmount();

    // App opened again: the saved session is restored.
    await renderApp();
    await waitFor(() => expect(screen.getByText('signedIn')).toBeTruthy());
    expect(auth.user?.profile?.firstName).toBe('Ana');

    await act(() => auth.logout());
    expect(screen.getByText('signedOut')).toBeTruthy();
  });

  it('asks for Face ID / fingerprint on open when it is turned on', async () => {
    const first = await renderApp();
    await waitFor(() => expect(screen.getByText('intro')).toBeTruthy());
    await act(() => auth.loginWithApple());
    await act(async () => {
      auth.setBiometricEnabled(true);
    });
    await first.unmount();

    await renderApp();
    await waitFor(() => expect(screen.getByText('locked')).toBeTruthy());
    await act(async () => {
      await auth.unlock();
    });
    expect(screen.getByText('needsProfile')).toBeTruthy();
    await act(async () => {
      auth.setBiometricEnabled(false);
    });
  });

  async function signedInAna() {
    const first = await renderApp();
    await waitFor(() => expect(screen.getByText('intro')).toBeTruthy());
    await act(async () => {
      auth.finishIntro();
    });
    await act(() => auth.signUp('ana@example.com', 'long enough pw', consents));
    await act(() => auth.verifySignUp('ana@example.com', MOCK_CODE));
    await act(() =>
      auth.saveProfile({
        firstName: 'Ana',
        passportCountry: 'AL',
        residenceCountry: 'AL',
        homeCurrency: 'ALL',
      }),
    );
    expect(screen.getByText('signedIn')).toBeTruthy();
    await first.unmount();
  }

  const failingRefresh = (error: AuthError): AuthService => ({
    ...createMockAuthService(),
    refresh: async () => {
      throw error;
    },
  });

  it('stays logged in when the app opens without reaching the API', async () => {
    await signedInAna();
    await renderApp(failingRefresh(new AuthError('network', 'Cannot reach the server.')));
    await waitFor(() => expect(screen.getByText('signedIn')).toBeTruthy());
    expect(auth.user?.profile?.firstName).toBe('Ana');
    expect(secure['travelapp.refreshToken']).toBeTruthy();
  });

  it('stays logged in when the API answers "too many tries" on open', async () => {
    await signedInAna();
    await renderApp(failingRefresh(new AuthError('too_many_attempts', 'Too many tries.')));
    await waitFor(() => expect(screen.getByText('signedIn')).toBeTruthy());
  });

  it('logs out when the API says the session is over', async () => {
    await signedInAna();
    await renderApp(failingRefresh(new AuthError('session_expired', 'Please log in again.')));
    await waitFor(() => expect(screen.getByText('signedOut')).toBeTruthy());
    expect(secure['travelapp.refreshToken']).toBeUndefined();
    expect(secure['travelapp.user']).toBeUndefined();
  });

  it('reset for testing goes straight to the intro', async () => {
    await signedInAna();
    await renderApp();
    await waitFor(() => expect(screen.getByText('signedIn')).toBeTruthy());
    phases.length = 0;
    await act(() => auth.resetForTesting());
    expect(screen.getByText('intro')).toBeTruthy();
    // Never passes through "signedOut", which would open the Log in screen instead.
    expect(phases).toEqual(['intro']);
    expect(getFlag('introSeen')).toBe(false);
  });
});
