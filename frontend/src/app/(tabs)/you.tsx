import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';

import { AppText, Button, Card, Screen, SyncIndicator } from '@/components';
import { dataMode } from '@/data';
import { useAuth } from '@/features/auth/AuthProvider';
import { biometricAvailable, biometricLabel } from '@/features/auth/biometric';
import { findCountry } from '@/data/static/countries';
import { getDeviceSettings, setDeviceSettings } from '@/services/deviceStorage';
import { sentryEnabled } from '@/services/sentry';
import { useTheme } from '@/theme/ThemeProvider';

/** You tab placeholder. Full profile and settings come with KAN-21. */
export default function YouScreen() {
  const { colors, space } = useTheme();
  const [wifiOnly, setWifiOnly] = useState(() => getDeviceSettings().uploadOnWifiOnly);
  const { user, logout, biometricEnabled, setBiometricEnabled, resetForTesting } = useAuth();
  const [bioLabel, setBioLabel] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (await biometricAvailable()) setBioLabel(await biometricLabel());
    })();
  }, []);

  const confirm = (title: string, message: string, action: () => void) => {
    if (Platform.OS === 'web') return action();
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: title, style: 'destructive', onPress: action },
    ]);
  };

  return (
    <Screen>
      <AppText variant="title">{user?.profile?.firstName ?? 'You'}</AppText>

      <Card>
        <AppText variant="label">Account</AppText>
        <AppText variant="body">{user?.email}</AppText>
        {user?.profile ? (
          <AppText variant="caption">
            Passport{' '}
            {findCountry(user.profile.passportCountry)?.name ?? user.profile.passportCountry}
            {' · '}Lives in{' '}
            {findCountry(user.profile.residenceCountry)?.name ?? user.profile.residenceCountry}
            {' · '}
            {user.profile.homeCurrency}
          </AppText>
        ) : null}
        <AppText variant="caption">Logged in with {user?.authProviders.join(', ')}</AppText>
      </Card>

      <Card>
        <AppText variant="label">This phone</AppText>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <AppText variant="body">Upload photos only on Wi-Fi</AppText>
          <Switch
            value={wifiOnly}
            onValueChange={(v) =>
              setWifiOnly(setDeviceSettings({ uploadOnWifiOnly: v }).uploadOnWifiOnly)
            }
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>
        {bioLabel ? (
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <AppText variant="body">Unlock with {bioLabel}</AppText>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        ) : null}
        <AppText variant="caption">
          Saved on this phone (MMKV). Stays after closing the app.
        </AppText>
      </Card>

      <Card>
        <AppText variant="label">About</AppText>
        <View style={{ gap: space.xs }}>
          <AppText variant="date">Version {Constants.expoConfig?.version ?? '-'}</AppText>
          <AppText variant="date">Data: {dataMode}</AppText>
          <AppText variant="date">Crash reporting: {sentryEnabled ? 'on' : 'off'}</AppText>
          <SyncIndicator showLabel />
        </View>
      </Card>

      <Button title="Open design kit" kind="secondary" onPress={() => router.push('/design-kit')} />
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
