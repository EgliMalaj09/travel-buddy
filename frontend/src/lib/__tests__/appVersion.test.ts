import { isOlderThan } from '../appVersion';

describe('minimum app version (KAN-55)', () => {
  it('compares each number, not the text', () => {
    expect(isOlderThan('1.9.0', '1.10.0')).toBe(true);
    expect(isOlderThan('1.10.0', '1.9.0')).toBe(false);
    expect(isOlderThan('1.0.0', '1.0.0')).toBe(false);
    expect(isOlderThan('1.0.0', '1.0.1')).toBe(true);
    expect(isOlderThan('2.0.0', '1.9.9')).toBe(false);
  });

  it('never blocks on a missing or odd value', () => {
    expect(isOlderThan('1.0.0', undefined)).toBe(false);
    expect(isOlderThan(undefined, '9.0.0')).toBe(false);
    expect(isOlderThan('1.0.0', 'one')).toBe(false);
  });
});
