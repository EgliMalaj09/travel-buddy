import { useState } from 'react';
import { Modal, View } from 'react-native';

import {
  ActionSheet,
  AppMap,
  AppMapMarker,
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
  Globe,
  PassportGrid,
  PhotoPlaceholder,
  Screen,
  SocialButtons,
  Stamp,
  StatTile,
  SunRating,
  SyncIndicator,
  TabRow,
} from '@/components';
import { AnimatedSplash } from '@/features/splash/AnimatedSplash';
import { useUiStore, type SyncStatus } from '@/store/uiStore';
import { useTheme } from '@/theme/ThemeProvider';

/** Shows every kit component with the current theme, for checking and for the designer. */
export default function DesignKitScreen() {
  const { colors, space, radii } = useTheme();
  const [chip, setChip] = useState('City');
  const setSync = useUiStore((s) => s.setSyncStatus);
  const [checked, setChecked] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [code, setCode] = useState('123');
  const [pick, setPick] = useState<string | undefined>('AL');
  const [tab, setTab] = useState('plan');
  const [splash, setSplash] = useState<'first' | 'later' | null>(null);
  const [suns, setSuns] = useState(4);

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

      <AppText variant="label">Tab row (trip page)</AppText>
      <TabRow
        tabs={[
          { key: 'plan', label: 'Plan' },
          { key: 'places', label: 'Places' },
          { key: 'checklist', label: 'Checklist' },
          { key: 'photos', label: 'Photos' },
          { key: 'expenses', label: 'Expenses' },
        ]}
        selected={tab}
        onSelect={setTab}
      />

      <EmptyState icon="images-outline" title="Empty state" message="Shown when a list is empty." />

      <Button title="Action sheet" kind="secondary" onPress={() => setSheet(true)} />
      <ActionSheet
        visible={sheet}
        title="Trip name"
        message="Menu used on the trip page."
        actions={[
          { label: 'Edit trip', onPress: () => undefined },
          { label: 'Delete trip', destructive: true, onPress: () => undefined },
        ]}
        onClose={() => setSheet(false)}
      />

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

      <AppText variant="heading">Core: map (KAN-37)</AppText>
      <AppMap view={{ kind: 'center', center: [12.4922, 41.8902], zoom: 13 }} height={200}>
        <AppMapMarker id="kit-pin" lngLat={[12.4922, 41.8902]}>
          <View
            style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent }}
          />
        </AppMapMarker>
      </AppMap>

      <AppText variant="heading">Core: finish trip (KAN-47)</AppText>
      <SunRating value={suns} onChange={setSuns} />
      <SunRating value={3} size={20} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Stamp code="PT" name="Portugal" date="NOV 2026" rotate={-9} />
        <Stamp code="IT" name="Italy" date="APR 2027" rotate={6} opacity={0.85} />
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <StatTile value="12" label="places visited" />
        <StatTile value="€845.20" label="spent" />
      </View>
      <View
        style={{
          flexDirection: 'row',
          gap: space.sm,
          backgroundColor: colors.accent,
          padding: space.md,
          borderRadius: radii.lg,
        }}
      >
        <StatTile onAccent value="48" label="photos" />
        <StatTile onAccent value="7" label="countries now" />
      </View>

      <AppText variant="heading">Core: atlas (KAN-49/50)</AppText>
      <Globe
        visited={['PT', 'IT', 'AT', 'GR']}
        here="PT"
        focus="IT"
        size={260}
        reduceMotion
        accessibilityLabel="Globe example"
      />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <StatTile compact value="6" label="countries" />
        <StatTile compact value="5" label="trips" />
        <StatTile compact value="38" label="days away" />
      </View>

      <AppText variant="heading">Feature: groups</AppText>
      <PassportGrid
        stamps={[
          { code: 'IT', name: 'Italy', date: 'APR 2026' },
          { code: 'AT', name: 'Austria', date: 'JUN 2026' },
          { code: 'PT', name: 'Portugal', date: 'NOV 2026' },
        ]}
      />
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

      <AppText variant="heading">Opening animation</AppText>
      <Button
        title="Play first-launch version"
        kind="secondary"
        onPress={() => setSplash('first')}
      />
      <Button title="Play everyday version" kind="ghost" onPress={() => setSplash('later')} />
      <Modal visible={splash !== null} animationType="none" onRequestClose={() => setSplash(null)}>
        {splash && (
          <AnimatedSplash firstLaunch={splash === 'first'} ready onDone={() => setSplash(null)} />
        )}
      </Modal>
    </Screen>
  );
}
