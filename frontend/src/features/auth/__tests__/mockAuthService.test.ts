import { createMockAuthService, MOCK_CODE, resetMockAuth } from '../mockAuthService';

const consents = { ageConfirmed: true, termsAccepted: true, marketingConsent: false };

describe('mock login service', () => {
  beforeEach(() => {
    resetMockAuth();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('signs up with email + code and trusts the phone', async () => {
    const auth = createMockAuthService();
    await auth.signUp('Ana@Example.com', 'long enough pw', consents);
    await expect(auth.verifySignUp('ana@example.com', '000000', 'phone-1')).rejects.toMatchObject({
      code: 'invalid_code',
    });
    const session = await auth.verifySignUp('ana@example.com', MOCK_CODE, 'phone-1');
    expect(session.user.email).toBe('ana@example.com');
    expect(session.user.profile).toBeNull();

    // Same phone: password is enough.
    const again = await auth.login('ana@example.com', 'long enough pw', 'phone-1');
    expect(again.kind).toBe('session');
  });

  it('asks for a code on a new phone', async () => {
    const auth = createMockAuthService();
    await auth.signUp('ana@example.com', 'long enough pw', consents);
    await auth.verifySignUp('ana@example.com', MOCK_CODE, 'phone-1');

    expect((await auth.login('ana@example.com', 'long enough pw', 'phone-2')).kind).toBe(
      'codeRequired',
    );
    await auth.verifyLogin('ana@example.com', MOCK_CODE, 'phone-2');
    expect((await auth.login('ana@example.com', 'long enough pw', 'phone-2')).kind).toBe('session');
  });

  it('rejects a wrong password and a taken email', async () => {
    const auth = createMockAuthService();
    await auth.signUp('ana@example.com', 'long enough pw', consents);
    await auth.verifySignUp('ana@example.com', MOCK_CODE, 'phone-1');
    await expect(auth.login('ana@example.com', 'wrong password', 'phone-1')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    await expect(auth.signUp('ana@example.com', 'another pw 123', consents)).rejects.toMatchObject({
      code: 'email_taken',
    });
  });

  it('resets the password with the code', async () => {
    const auth = createMockAuthService();
    await auth.signUp('ana@example.com', 'long enough pw', consents);
    await auth.verifySignUp('ana@example.com', MOCK_CODE, 'phone-1');
    await auth.resetPassword('ana@example.com', MOCK_CODE, 'brand new password');
    expect((await auth.login('ana@example.com', 'brand new password', 'phone-1')).kind).toBe(
      'session',
    );
  });

  it('saves the profile for the logged-in user and keeps it after refresh', async () => {
    const auth = createMockAuthService();
    const session = await auth.loginWithGoogle('phone-1');
    expect(session.user.suggestedFirstName).toBe('Alex');
    const profile = {
      firstName: 'Alex',
      passportCountry: 'AL',
      residenceCountry: 'AL',
      homeCurrency: 'ALL',
    };
    await auth.saveProfile(session.accessToken, profile, consents);
    const refreshed = await auth.refresh(session.refreshToken);
    expect(refreshed.user.profile).toEqual(profile);
    // The old refresh token was replaced.
    await expect(auth.refresh(session.refreshToken)).rejects.toMatchObject({
      code: 'session_expired',
    });
  });
});
