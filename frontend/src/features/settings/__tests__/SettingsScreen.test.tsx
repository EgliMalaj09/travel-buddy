import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { SettingsScreen } from '../SettingsScreen';
import { planReminders } from '@/lib/reminders';
import { loadReminderInput } from '@/features/reminders/reminderInput';
import { useUserSettings } from '@/services/userSettings';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('@/data', () => {
  const actual = jest.requireActual('@/data');
  const { createMockTripRepository } = jest.requireActual('@/data/repositories/tripRepository');
  return { ...actual, dataMode: 'mock', repositories: { trips: createMockTripRepository() } };
});

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'test@example.com', authProviders: ['email'] },
    logout: jest.fn(),
    biometricEnabled: false,
    setBiometricEnabled: jest.fn(),
    resetForTesting: jest.fn(),
  }),
}));

jest.mock('@/services/reminders', () => ({
  reminderPermission: jest.fn(async () => 'granted'),
  requestReminderPermission: jest.fn(async () => true),
  openNotificationSettings: jest.fn(),
}));

describe('Settings screen', () => {
  beforeEach(() => {
    // No screen is open here, so no act() is needed.
    useUserSettings.getState().load(null);
    useUserSettings.getState().load('u1');
    useUserSettings.getState().update({ remindersEnabled: true, remindFlight: true });
  });

  it('turns off flight reminders and the plan follows', async () => {
    await render(<SettingsScreen />);
    expect(
      await screen.findByText('Evening reminders come at 19:00.', { exact: false }),
    ).toBeTruthy();

    const before = planReminders({ ...(await loadReminderInput()), now: new Date() });
    await act(async () => fireEvent(screen.getByLabelText('Flights'), 'valueChange', false));
    expect(useUserSettings.getState().settings.remindFlight).toBe(false);
    const after = planReminders({ ...(await loadReminderInput()), now: new Date() });
    expect(after.some((r) => r.kind.startsWith('flight'))).toBe(false);
    expect(after.length).toBeLessThanOrEqual(before.length);
  });

  it('turning all reminders off hides the details and plans nothing', async () => {
    await render(<SettingsScreen />);
    await act(async () => fireEvent(screen.getByLabelText('Trip reminders'), 'valueChange', false));
    expect(screen.getByText('No trip reminders on this account.')).toBeTruthy();
    expect(screen.queryByText('Quiet hours')).toBeNull();
    expect(planReminders({ ...(await loadReminderInput()), now: new Date() })).toEqual([]);
  });

  it('keeps settings per account', () => {
    useUserSettings.getState().update({ reminderTime: '20:00' });
    useUserSettings.getState().load('u2');
    expect(useUserSettings.getState().settings.reminderTime).toBe('19:00');
    useUserSettings.getState().load('u1');
    expect(useUserSettings.getState().settings.reminderTime).toBe('20:00');
  });
});
