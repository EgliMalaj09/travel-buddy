import { pickAuthMode } from '../authMode';

describe('auth mode', () => {
  it('uses mock login only when asked, in development', () => {
    expect(pickAuthMode(undefined, false)).toBe('api');
    expect(pickAuthMode('api', false)).toBe('api');
    expect(pickAuthMode('mock', false)).toBe('mock');
  });

  it('never uses mock login in a release build (beta, KAN-60)', () => {
    expect(pickAuthMode('mock', true)).toBe('api');
    expect(pickAuthMode(undefined, true)).toBe('api');
  });
});
