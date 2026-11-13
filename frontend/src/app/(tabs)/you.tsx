import Constants from 'expo-constants';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, Card, Screen, SyncIndicator } from '@/components';
import { dataMode } from '@/data';
import { useAuth } from '@/features/auth/AuthProvider';
import { findCountry } from '@/data/static/countries';
import { sentryEnabled } from '@/services/sentry';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * You tab: who is logged in and a way into Settings (KAN-21). Reminders, this phone's settings and
 * log out are on the Settings screen, with Edit profile, Download my data and Delete account (KAN-22).
 */
export default function YouScreen() {
  const { space } = useTheme();
  const { user } = useAuth();

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
      </Card>

      <Button title="Settings" onPress={() => router.push('/settings')} />

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
    </Screen>
  );
}
