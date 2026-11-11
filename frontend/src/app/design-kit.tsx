import { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  Screen,
  SyncIndicator,
} from '@/components';
import { useUiStore, type SyncStatus } from '@/store/uiStore';
import { useTheme } from '@/theme/ThemeProvider';

/** Shows every kit component with the current theme, for checking and for the designer. */
export default function DesignKitScreen() {
  const { colors, space, radii } = useTheme();
  const [chip, setChip] = useState('City');
  const setSync = useUiStore((s) => s.setSyncStatus);

  return (
    <Screen>
      <AppText variant="title">Title</AppText>
      <AppText variant="heading">Heading</AppText>
      <AppText variant="body">Body text in Hanken Grotesk.</AppText>
      <AppText variant="date">12 Apr – 18 Apr 2027</AppText>
      <AppText variant="note">My own note, in Kalam.</AppText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {Object.entries(colors).map(([name, value]) => (
          <View key={name} style={{ alignItems: 'center', gap: space.xxs }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.sm,
                backgroundColor: value,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <AppText variant="caption">{name}</AppText>
          </View>
        ))}
      </View>

      <Button title="Primary button" onPress={() => {}} />
      <Button title="Secondary button" kind="secondary" onPress={() => {}} />
      <Button title="Ghost button" kind="ghost" onPress={() => {}} />
      <Input label="Input" placeholder="Type here" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {['Beach', 'City', 'Culture', 'Food'].map((c) => (
          <Chip key={c} label={c} selected={chip === c} onPress={() => setChip(c)} />
        ))}
      </View>

      <Card>
        <AppText variant="label">Sync indicator (tap a state)</AppText>
        <SyncIndicator showLabel />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(['synced', 'syncing', 'offline', 'error'] as SyncStatus[]).map((s) => (
            <Chip key={s} label={s} onPress={() => setSync(s)} />
          ))}
        </View>
      </Card>

      <EmptyState icon="images-outline" title="Empty state" message="Shown when a list is empty." />
    </Screen>
  );
}
