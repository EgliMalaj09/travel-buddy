import { loginSchema, resetSchema, signUpSchema } from '../validation';

describe('login form rules', () => {
  it('needs a valid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: ' Ana@Example.com ', password: 'x' }).success).toBe(true);
  });
});

describe('sign-up form rules', () => {
  const ok = {
    email: 'ana@example.com',
    password: 'long enough pw',
    ageConfirmed: true,
    termsAccepted: true,
    marketingConsent: false,
  };

  it('accepts a complete form', () => {
    expect(signUpSchema.safeParse(ok).success).toBe(true);
  });

  it('needs a password of at least 10 characters', () => {
    expect(signUpSchema.safeParse({ ...ok, password: 'short' }).success).toBe(false);
  });

  it('needs 16+ and the terms; marketing stays optional', () => {
    expect(signUpSchema.safeParse({ ...ok, ageConfirmed: false }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, termsAccepted: false }).success).toBe(false);
  });
});

describe('reset password rules', () => {
  it('needs a 6-digit code and matching passwords', () => {
    const base = { code: '123456', password: 'new password 1', confirm: 'new password 1' };
    expect(resetSchema.safeParse(base).success).toBe(true);
    expect(resetSchema.safeParse({ ...base, code: '12345' }).success).toBe(false);
    expect(resetSchema.safeParse({ ...base, confirm: 'different pw' }).success).toBe(false);
  });
});
