import { getDeviceSettings, getFlag, setDeviceSettings, setFlag } from '../deviceStorage';

describe('device storage (MMKV)', () => {
  it('returns defaults, then remembers changes', () => {
    expect(getDeviceSettings().uploadOnWifiOnly).toBe(true);
    setDeviceSettings({ uploadOnWifiOnly: false });
    expect(getDeviceSettings().uploadOnWifiOnly).toBe(false);
    expect(getDeviceSettings().theme).toBe('system');
  });

  it('stores flags', () => {
    expect(getFlag('onboardingSeen')).toBe(false);
    setFlag('onboardingSeen', true);
    expect(getFlag('onboardingSeen')).toBe(true);
  });
});
