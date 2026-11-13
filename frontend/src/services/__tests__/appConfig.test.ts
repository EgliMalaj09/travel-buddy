import { cachedAppConfig, refreshAppConfig, updateRequired, type AppConfig } from '../appConfig';

const config = (minAppVersion: string): AppConfig => ({
  minAppVersion,
  maxPhotoSizeMb: 15,
  freeTripLimit: 1,
  photoQualityByPlan: { free: 'compressed', paid: 'full' },
  featureFlags: {},
  version: 1,
  updatedAt: '2026-11-13T00:00:00Z',
});

describe('app settings from the back office (KAN-55)', () => {
  it('keeps the last copy for offline use', async () => {
    await refreshAppConfig(async () => config('1.0.0'));
    const offline = await refreshAppConfig(async () => null);
    expect(offline?.minAppVersion).toBe('1.0.0');
    expect(cachedAppConfig()?.minAppVersion).toBe('1.0.0');
  });

  it('asks for an update only when this version is older than the minimum', () => {
    expect(updateRequired(config('1.1.0'), '1.0.0')).toBe(true);
    expect(updateRequired(config('1.0.0'), '1.0.0')).toBe(false);
    expect(updateRequired(null, '1.0.0')).toBe(false);
  });
});
