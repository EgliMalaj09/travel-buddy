import { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Checkbox,
  Chip,
  CodeInput,
  EmptyState,
  Input,
  Logo,
  OptionPicker,
  OrDivider,
  PhotoPlaceholder,
  Screen,
  SocialButtons,
  SyncIndicator,
} from '@/components';
import { useUiStore, type SyncStatus } from '@/store/uiStore';
import { useTheme } from '@/theme/ThemeProvider';

/** Shows every kit component with the current theme, for checking and for the designer. */
export default function DesignKitScreen() {
  const { colors, space, radii } = useTheme();
  const [chip, setChip] = useState('City');
  const setSync = useUiStore((s) => s.setSyncStatus);
  const [checked, setChecked] = useState(true);
  const [code, setCode] = useState('123');
  const [pick, setPick] = useState<string | undefined>('AL');

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

      <AppText variant="heading">Core: login pieces</AppText>
      <Logo />
      <Checkbox checked={checked} onChange={setChecked} label="I am 16 or older" />
      <Checkbox checked={false} onChange={() => undefined} label="With an error" error="Required" />
      <Input label="Password" password defaultValue="secret password" />
      <CodeInput value={code} onChange={setCode} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <PhotoPlaceholder width={80} height={80} />
        <PhotoPlaceholder width={80} height={80} round />
      </View>

      <AppText variant="heading">Feature: groups</AppText>
      <SocialButtons onApple={() => undefined} onGoogle={() => undefined} />
      <OrDivider />
      <OptionPicker
        label="Country"
        value={pick}
        onChange={setPick}
        options={[
          { value: 'AL', label: 'Albania', hint: 'ALL' },
          { value: 'IT', label: 'Italy', hint: 'EUR' },
          { value: 'MA', label: 'Morocco', hint: 'MAD' },
        ]}
      />
    </Screen>
  );
}
