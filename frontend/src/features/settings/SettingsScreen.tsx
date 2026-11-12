import { useEffect, useState, type ReactNode } from 'react';
import { Alert, AppState, Platform, Switch, View } from 'react-native';

import { AppText, Button, Card, OptionPicker, Screen } from '@/components';
import { dataMode } from '@/data';
import { useAuth } from '@/features/auth/AuthProvider';
import { biometricAvailable, biometricLabel } from '@/features/auth/biometric';
import { eveningTime } from '@/lib/reminders';
import { defaultUserSettings, quietHoursOff, timeChoices } from '@/lib/settings';
import { getDeviceSettings, setDeviceSettings } from '@/services/deviceStorage';
import {
  openNotificationSettings,
  reminderPermission,
  requestReminderPermission,
  type ReminderPermission,
} from '@/services/reminders';
import { useUserSettings } from '@/services/userSettings';
import { useTheme } from '@/theme/ThemeProvider';

const timeOptions = timeChoices.map((t) => ({ value: t, label: t }));

/**
 * Settings (KAN-21): reminder switches, reminder time and quiet hours (UserSettings, one per
 * account), this phone's own settings (DeviceSettings) and the account (log out).
 */
export function SettingsScreen() {
  const { colors, space } = useTheme();
  const { settings, update } = useUserSettings();
  const { user, logout, biometricEnabled, setBiometricEnabled, resetForTesting } = useAuth();
  const [wifiOnly, setWifiOnly] = useState(() => getDeviceSettings().uploadOnWifiOnly);
  const [bioLabel, setBioLabel] = useState<string | null>(null);
  const [permission, setPermission] = useState<ReminderPermission | null>(null);

  useEffect(() => {
    void (async () => {
      if (await biometricAvailable()) setBioLabel(await biometricLabel());
    })();
  }, []);

  // Check the phone's notification permission now and whenever the app comes back to the front
  // (the user may have turned notifications on in the phone's settings).
  useEffect(() => {
    const check = () => void reminderPermission().then(setPermission);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  const confirm = (title: string, message: string, action: () => void) => {
    if (Platform.OS === 'web') return action();
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: title, style: 'destructive', onPress: action },
    ]);
  };

  const on = settings.remindersEnabled;
  const quietOff = quietHoursOff(settings);
  const sendsAt = eveningTime(settings);

  return (
    <Screen>
      <Card>
        <AppText variant="label">Reminders</AppText>
        <SettingSwitch
          label="Trip reminders"
          value={on}
          onChange={(v) => update({ remindersEnabled: v })}
        />
        {on ? (
          <>
            <SettingSwitch
              label="Get ready (30, 7 and 1 days before)"
              value={settings.remindChecklist}
              onChange={(v) => update({ remindChecklist: v })}
            />
            <SettingSwitch
              label="Pack tonight"
              value={settings.remindPackTonight}
              onChange={(v) => update({ remindPackTonight: v })}
            />
            <SettingSwitch
              label="Flights"
              value={settings.remindFlight}
              onChange={(v) => update({ remindFlight: v })}
            />
          </>
        ) : (
          <AppText variant="caption" color={colors.inkSoft}>
            No trip reminders on this account.
          </AppText>
        )}
        <PermissionNote
          permission={permission}
          onAsk={async () => {
            await requestReminderPermission();
            setPermission(await reminderPermission());
          }}
        />
      </Card>

      {on ? (
        <Card>
          <AppText variant="label">When</AppText>
          <OptionPicker
            label="Evening reminders at"
            value={settings.reminderTime}
            options={timeOptions}
            onChange={(t) => update({ reminderTime: t })}
          />
          <SettingSwitch
            label="Quiet hours"
            value={!quietOff}
            onChange={(v) =>
              update(
                v
                  ? {
                      quietHoursStart: defaultUserSettings.quietHoursStart,
                      quietHoursEnd: defaultUserSettings.quietHoursEnd,
                    }
                  : { quietHoursStart: '00:00', quietHoursEnd: '00:00' },
              )
            }
          />
          {quietOff ? null : (
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <OptionPicker
                  label="From"
                  value={settings.quietHoursStart}
                  options={timeOptions}
                  onChange={(t) => update({ quietHoursStart: t })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <OptionPicker
                  label="To"
                  value={settings.quietHoursEnd}
                  options={timeOptions}
                  onChange={(t) => update({ quietHoursEnd: t })}
                />
              </View>
            </View>
          )}
          <AppText variant="caption" color={colors.inkSoft}>
            {sendsAt === settings.reminderTime
              ? `Evening reminders come at ${sendsAt}.`
              : `${settings.reminderTime} is in your quiet hours, so evening reminders come at ${sendsAt}.`}
            {quietOff
              ? ''
              : ' Nothing buzzes in quiet hours, except the flight reminder 3 hours before takeoff.'}
          </AppText>
        </Card>
      ) : null}

      <Card>
        <AppText variant="label">This phone</AppText>
        <SettingSwitch
          label="Upload photos only on Wi-Fi"
          value={wifiOnly}
          onChange={(v) => setWifiOnly(setDeviceSettings({ uploadOnWifiOnly: v }).uploadOnWifiOnly)}
        />
        {bioLabel ? (
          <SettingSwitch
            label={`Unlock with ${bioLabel}`}
            value={biometricEnabled}
            onChange={setBiometricEnabled}
          />
        ) : null}
      </Card>

      <Card>
        <AppText variant="label">Account</AppText>
        <AppText variant="body">{user?.email}</AppText>
        <AppText variant="caption">Logged in with {user?.authProviders.join(', ')}</AppText>
      </Card>

      <Button
        title="Log out"
        kind="secondary"
        onPress={() =>
          confirm('Log out', 'You can log in again with your email, Google or Apple.', logout)
        }
      />
      {__DEV__ || dataMode === 'mock' ? (
        <Button
          title="Reset login (testing)"
          kind="ghost"
          onPress={() =>
            confirm(
              'Reset',
              'Logs out, forgets all test accounts on this phone and shows the intro again.',
              resetForTesting,
            )
          }
        />
      ) : null}
    </Screen>
  );
}

function SettingSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors, space } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: space.md,
        minHeight: 44,
      }}
    >
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
      />
    </View>
  );
}

/** Reminders only arrive when the phone allows notifications for this app. */
function PermissionNote({
  permission,
  onAsk,
}: {
  permission: ReminderPermission | null;
  onAsk: () => void;
}): ReactNode {
  const { colors } = useTheme();
  if (permission === 'denied')
    return (
      <>
        <AppText variant="caption" color={colors.inkSoft}>
          Notifications are off for this app in the phone&apos;s settings.
        </AppText>
        <Button title="Open phone settings" kind="ghost" onPress={openNotificationSettings} />
      </>
    );
  if (permission === 'notAsked')
    return <Button title="Allow notifications" kind="ghost" onPress={onAsk} />;
  if (permission === 'unsupported')
    return (
      <AppText variant="caption" color={colors.inkSoft}>
        Reminders come on the phone app.
      </AppText>
    );
  return null;
}
