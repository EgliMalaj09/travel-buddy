import { errorCode, errorText } from '@/api/client';
import { clearSession, readSession, saveSession } from '@/auth/session';
import { formatDay, relativeDays } from '@/lib/format';
import { roleAtLeast } from '@/lib/roles';

describe('roles', () => {
  it('each role can do what the one before it can', () => {
    expect(roleAtLeast('owner', 'support')).toBe(true);
    expect(roleAtLeast('support', 'support')).toBe(true);
    expect(roleAtLeast('viewer', 'support')).toBe(false);
    expect(roleAtLeast('nobody', 'viewer')).toBe(false);
  });
});

describe('dates the design guide way', () => {
  const now = new Date('2026-11-13T12:00:00');
  it('shows "Thu 12 Nov" this year and adds the year otherwise', () => {
    expect(formatDay('2026-11-12', now)).toBe('Thu 12 Nov');
    expect(formatDay('2025-11-12', now)).toBe('Wed 12 Nov 2025');
    expect(formatDay(null, now)).toBe('–');
  });
  it('says how far away a date is', () => {
    expect(relativeDays('2026-11-25T12:00:00', now)).toBe('in 12 days');
    expect(relativeDays('2026-11-13T12:00:00', now)).toBe('today');
  });
});

describe('session', () => {
  beforeEach(() => clearSession());
  const me = { userId: 'u1', email: 'a@b.co', role: 'owner' };

  it('keeps the session in this tab until it expires', () => {
    saveSession({ token: 't', expiresAt: new Date(Date.now() + 60_000).toISOString(), me });
    expect(readSession()?.token).toBe('t');
    expect(readSession(Date.now() + 120_000)).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});

describe('API errors', () => {
  it('shows the friendly title, or a fallback for validation errors', () => {
    expect(errorText({ title: 'Email or password is not right.', code: 'invalid_credentials' })).toBe('Email or password is not right.');
    expect(errorText({ title: 'One or more validation errors occurred.', errors: { q: ['x'] } })).toBe('Check what you typed and try again.');
    expect(errorText(undefined)).toBe('Something went wrong. Try again.');
    expect(errorCode({ code: 'conflict' })).toBe('conflict');
  });
});
