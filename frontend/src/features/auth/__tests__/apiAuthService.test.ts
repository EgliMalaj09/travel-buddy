import { defaultApiBaseUrl } from '@/api/client';

import { createApiAuthService, toAuthError } from '../apiAuthService';
import { AuthError } from '../types';

type FetchMock = jest.Mock<Promise<Response>, [Request]>;

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const user = {
  id: '0b9d7a3e-1111-4222-8333-444455556666',
  email: 'ana@example.com',
  authProviders: ['email'],
  profile: null,
  suggestedFirstName: null,
  consents: { ageConfirmed: true, termsAccepted: true, marketingConsent: false },
};
const session = {
  accessToken: 'access',
  accessTokenExpiresAt: '2026-11-12T12:00:00Z',
  refreshToken: 'refresh',
  user,
};

let fetchMock: FetchMock;
beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

const lastRequest = () => fetchMock.mock.calls.at(-1)![0];

describe('defaultApiBaseUrl', () => {
  it('uses 10.0.2.2 on Android (emulator) and localhost elsewhere', () => {
    expect(defaultApiBaseUrl('android', undefined)).toBe('http://10.0.2.2:5001');
    expect(defaultApiBaseUrl('web', undefined)).toBe('http://localhost:5001');
    expect(defaultApiBaseUrl('ios', undefined)).toBe('http://localhost:5001');
  });
  it('lets EXPO_PUBLIC_API_URL win', () => {
    expect(defaultApiBaseUrl('android', 'http://192.168.1.20:5001/')).toBe(
      'http://192.168.1.20:5001',
    );
  });
});

describe('api auth service', () => {
  const service = createApiAuthService();

  it('logs in and maps the session', async () => {
    fetchMock.mockResolvedValue(json(200, { kind: 'session', session }));
    const result = await service.login('ana@example.com', 'long-password', 'device-1234');
    expect(lastRequest().url).toMatch(/\/auth\/login$/);
    expect(await lastRequest().json()).toEqual({
      email: 'ana@example.com',
      password: 'long-password',
      deviceId: 'device-1234',
    });
    expect(result).toEqual({
      kind: 'session',
      session: {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { ...user, suggestedFirstName: undefined },
      },
    });
  });

  it('returns codeRequired on a new phone', async () => {
    fetchMock.mockResolvedValue(json(200, { kind: 'codeRequired', session: null }));
    expect(await service.login('ana@example.com', 'long-password', 'device-1234')).toEqual({
      kind: 'codeRequired',
    });
  });

  it('turns a wrong password into an AuthError with the server text', async () => {
    fetchMock.mockResolvedValue(
      json(401, { title: 'Email or password is not right.', code: 'invalid_credentials' }),
    );
    await expect(service.login('a@b.co', 'x', 'device-1234')).rejects.toMatchObject({
      code: 'invalid_credentials',
      message: 'Email or password is not right.',
    });
  });

  it('reports a network error when the API cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(service.forgotPassword('a@b.co')).rejects.toMatchObject({ code: 'network' });
  });

  it('accepts 204 answers (sign-up step 1)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      service.signUp('a@b.co', 'long-password', {
        ageConfirmed: true,
        termsAccepted: true,
        marketingConsent: false,
      }),
    ).resolves.toBeUndefined();
  });

  it('sends the access token when saving the profile', async () => {
    fetchMock.mockResolvedValue(json(200, user));
    await service.saveProfile('access', {
      firstName: 'Ana',
      passportCountry: 'AL',
      residenceCountry: 'AL',
      homeCurrency: 'EUR',
    });
    expect(lastRequest().url).toMatch(/\/me\/profile$/);
    expect(lastRequest().headers.get('Authorization')).toBe('Bearer access');
  });

  it('says Google/Apple are not connected yet', async () => {
    await expect(service.loginWithGoogle('device-1234')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('toAuthError', () => {
  it('maps a plain 429 and a validation 400', () => {
    expect(toAuthError(429, undefined).code).toBe('too_many_attempts');
    const invalid = toAuthError(400, { title: 'One or more validation errors occurred.' });
    expect(invalid.code).toBe('invalid_input');
    expect(invalid.message).toBe('Check what you typed and try again.');
  });
});
