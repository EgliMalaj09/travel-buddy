import { currentAccessToken, setTokenProvider, tokenExpiry } from '../client';

const b64url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (exp: number) => `${b64url('{"alg":"ES256"}')}.${b64url(JSON.stringify({ exp }))}.sig`;

const NOW = 1_800_000_000;

function provide(token: string | null) {
  const refresh = jest.fn(async () => 'fresh-token');
  setTokenProvider({ getAccessToken: async () => token, refresh });
  return refresh;
}

afterEach(() => setTokenProvider(null));

describe('access token for PowerSync', () => {
  it('reads the expiry of a JWT', () => {
    expect(tokenExpiry(jwt(NOW))).toBe(NOW);
    expect(tokenExpiry('not-a-jwt')).toBeNull();
  });

  it('gives the current token while it is still valid', async () => {
    const refresh = provide(jwt(NOW + 600));
    await expect(currentAccessToken(NOW)).resolves.toBe(jwt(NOW + 600));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes a token that is about to expire', async () => {
    const refresh = provide(jwt(NOW + 30));
    await expect(currentAccessToken(NOW)).resolves.toBe('fresh-token');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when there is no token yet (the app opened offline)', async () => {
    const refresh = provide('');
    await expect(currentAccessToken(NOW)).resolves.toBe('fresh-token');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('is null when nobody is logged in', async () => {
    await expect(currentAccessToken(NOW)).resolves.toBeNull();
  });
});
