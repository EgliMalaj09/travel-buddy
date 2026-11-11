import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card } from '@/components';
import { findCountry } from '@/data/static/countries';
import { newId } from '@/lib/ids';
import { addStop, moveStop, removeStop, type TripDraft } from '@/lib/tripDraft';
import { flagEmoji } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

import { CitySearchModal } from '../ui/CitySearchModal';

/** Step 1: the cities where you will stay, in order. */
export function WhereStep({
  draft,
  onChange,
}: {
  draft: TripDraft;
  onChange: (d: TripDraft) => void;
}) {
  const { colors, space } = useTheme();
  const [searching, setSearching] = useState(false);

  const icon = (
    name: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={{
        width: 40,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.25 : 1,
      }}
    >
      <Ionicons name={name} size={20} color={colors.inkSoft} />
    </Pressable>
  );

  return (
    <View style={{ gap: space.md }}>
      {draft.stops.map((s, i) => (
        <Card key={s.key}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <AppText variant="date" style={{ width: 20 }}>
              {i + 1}
            </AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">
                {flagEmoji(s.countryCode)} {s.cityName}
              </AppText>
              <AppText variant="caption">
                {findCountry(s.countryCode)?.name ?? s.countryCode}
                {s.lat === null ? ' · map position added when online' : ''}
              </AppText>
            </View>
            {icon(
              'arrow-up',
              `Move ${s.cityName} up`,
              () => onChange(moveStop(draft, i, -1)),
              i === 0,
            )}
            {icon(
              'arrow-down',
              `Move ${s.cityName} down`,
              () => onChange(moveStop(draft, i, 1)),
              i === draft.stops.length - 1,
            )}
            {icon('trash-outline', `Remove ${s.cityName}`, () => onChange(removeStop(draft, i)))}
          </View>
        </Card>
      ))}
      <Button
        title={draft.stops.length ? '+ Add another stop' : '+ Add a city'}
        kind="secondary"
        onPress={() => setSearching(true)}
      />
      <CitySearchModal
        visible={searching}
        onClose={() => setSearching(false)}
        onPick={(city) => {
          const key = newId();
          onChange(addStop(draft, { key, ...city }));
        }}
      />
    </View>
  );
}
