import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { AppText, Button, Card, Screen, SyncIndicator } from '@/components';
import { dataMode } from '@/data';
import { getDeviceSettings, setDeviceSettings } from '@/services/deviceStorage';
import { sentryEnabled } from '@/services/sentry';
import { useTheme } from '@/theme/ThemeProvider';

/** You tab placeholder. Full profile and settings come with KAN-21. */
export default function YouScreen() {
  const { colors, space } = useTheme();
  const [wifiOnly, setWifiOnly] = useState(() => getDeviceSettings().uploadOnWifiOnly);

  return (
    <Screen>
      <AppText variant="title">You</AppText>

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
    </Screen>
  );
}
