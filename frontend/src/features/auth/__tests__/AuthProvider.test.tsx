import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { getFlag, setFlag } from '@/services/deviceStorage';

import { AuthProvider, useAuth } from '../AuthProvider';
import { MOCK_CODE, resetMockAuth } from '../mockAuthService';

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
function Probe() {
  const value = useAuth();
  useEffect(() => {
    holder.current = value;
  });
  return <Text>{value.phase}</Text>;
}
const auth = new Proxy({} as ReturnType<typeof useAuth>, {
  get: (_, key) => holder.current?.[key as keyof ReturnType<typeof useAuth>],
});

const renderApp = () =>
  render(
    <AuthProvider>
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
});
