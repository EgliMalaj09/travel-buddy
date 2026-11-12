import { createHash } from 'crypto';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

const google = GoogleSignin as jest.Mocked<typeof GoogleSignin>;
const apple = AppleAuthentication as jest.Mocked<typeof AppleAuthentication>;

function load(webClientId: string | undefined) {
  let mod: typeof import('../socialSignIn');
  if (webClientId) process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = webClientId;
  else delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module per env value
    mod = require('../socialSignIn');
  });
  return mod!;
}

beforeEach(() => jest.clearAllMocks());
afterAll(() => delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

describe('Google sheet', () => {
  it('says "not set up" when the web client id is missing', async () => {
    await expect(load(undefined).signInWithGoogle()).rejects.toMatchObject({
      code: 'not_available',
    });
    expect(google.signIn).not.toHaveBeenCalled();
  });

  it('returns the ID token and first name', async () => {
    google.signIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'tok', user: { givenName: 'Ana' } },
    } as never);
    const sheets = load('web-id.apps.googleusercontent.com');
    await expect(sheets.signInWithGoogle()).resolves.toEqual({ idToken: 'tok', firstName: 'Ana' });
    expect(google.configure).toHaveBeenCalledWith(
      expect.objectContaining({ webClientId: 'web-id.apps.googleusercontent.com' }),
    );
  });

  it('turns a closed sheet into "cancelled"', async () => {
    google.signIn.mockResolvedValue({ type: 'cancelled', data: null } as never);
    await expect(load('web-id').signInWithGoogle()).rejects.toMatchObject({ code: 'cancelled' });
    google.signIn.mockRejectedValue(Object.assign(new Error('x'), { code: 'SIGN_IN_CANCELLED' }));
    await expect(load('web-id').signInWithGoogle()).rejects.toMatchObject({ code: 'cancelled' });
  });
});

describe('Apple sheet', () => {
  it('says "works on iPhone" where Apple login is not available', async () => {
    apple.isAvailableAsync.mockResolvedValueOnce(false);
    await expect(load(undefined).signInWithApple()).rejects.toMatchObject({
      code: 'not_available',
    });
  });

  it('returns the identity token and the first name (first time only)', async () => {
    apple.signInAsync.mockResolvedValue({
      identityToken: 'apple-tok',
      fullName: { givenName: 'Ana' },
    } as never);
    const result = await load(undefined).signInWithApple();
    expect(result).toEqual({ idToken: 'apple-tok', firstName: 'Ana', nonce: expect.any(String) });
  });

  it('gives Apple the SHA-256 of a fresh nonce and returns the plain nonce for the backend', async () => {
    apple.signInAsync.mockResolvedValue({ identityToken: 'apple-tok', fullName: null } as never);
    const sheets = load(undefined);
    const first = await sheets.signInWithApple();
    const second = await sheets.signInWithApple();

    expect(first.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(second.nonce).not.toEqual(first.nonce);
    const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
    expect(apple.signInAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ nonce: sha256(first.nonce!) }),
    );
  });

  it('turns a closed sheet into "cancelled"', async () => {
    apple.signInAsync.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'ERR_REQUEST_CANCELED' }),
    );
    await expect(load(undefined).signInWithApple()).rejects.toMatchObject({ code: 'cancelled' });
  });
});
