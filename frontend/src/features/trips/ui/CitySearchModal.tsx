import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components';
import type { City } from '@/data/static/cities';
import { countries, findCountry } from '@/data/static/countries';
import { flagEmoji } from '@/lib/trips';
import { citySearch, fold } from '@/services/citySearch';
import { useTheme } from '@/theme/ThemeProvider';

export interface PickedCity {
  cityName: string;
  countryCode: string;
  lat: number | null;
  lng: number | null;
  geoProviderId: string | null;
}

/**
 * Full-screen city search (step 1). If the city is not in the list (or the phone is offline
 * once Mapbox is used), the user keeps what they typed and picks the country; the map
 * position is filled in later.
 */
export function CitySearchModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (city: PickedCity) => void;
}) {
  const { colors, fonts, fontSizes, radii, space } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [typedCity, setTypedCity] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    citySearch.search(query).then((r) => active && setResults(r));
    return () => {
      active = false;
    };
  }, [query]);

  const countryMatches = useMemo(() => {
    const q = fold(query);
    return typedCity !== null && q ? countries.filter((c) => fold(c.name).includes(q)) : countries;
  }, [query, typedCity]);

  const close = () => {
    setQuery('');
    setTypedCity(null);
    onClose();
  };
  const finish = (city: PickedCity) => {
    onPick(city);
    close();
  };

  const row = (key: string, prefix: string, label: string, hint: string, onPress: () => void) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingHorizontal: space.lg,
        minHeight: 56,
        backgroundColor: pressed ? colors.surface : 'transparent',
      })}
    >
      <AppText variant="body">{prefix}</AppText>
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="caption">{hint}</AppText>
    </Pressable>
  );

  const pickingCountry = typedCity !== null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md }}
        >
          <AppText variant="heading" style={{ flex: 1 }}>
            {pickingCountry ? `Which country is ${typedCity} in?` : 'Where will you stay?'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={pickingCountry ? 'Search countries' : 'Search a city'}
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel={pickingCountry ? 'Search countries' : 'Search a city'}
            autoFocus
            autoCorrect={false}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radii.md,
              padding: space.md,
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              color: colors.ink,
            }}
          />
        </View>
        {pickingCountry ? (
          <FlatList
            data={countryMatches}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) =>
              row(item.code, flagEmoji(item.code), item.name, '', () =>
                finish({
                  cityName: typedCity,
                  countryCode: item.code,
                  lat: null,
                  lng: null,
                  geoProviderId: null,
                }),
              )
            }
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(c) => c.geoProviderId}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              query.trim() ? undefined : (
                <AppText
                  variant="body"
                  color={colors.inkSoft}
                  style={{ paddingHorizontal: space.lg }}
                >
                  Type a city, e.g. Rome. Sights like the Colosseum are added later as places.
                </AppText>
              )
            }
            ListFooterComponent={
              query.trim().length > 1
                ? row('typed', '＋', `Use “${query.trim()}”`, 'pick the country', () => {
                    setTypedCity(query.trim());
                    setQuery('');
                  })
                : undefined
            }
            renderItem={({ item }) =>
              row(
                item.geoProviderId,
                flagEmoji(item.countryCode),
                item.cityName,
                findCountry(item.countryCode)?.name ?? item.countryCode,
                () =>
                  finish({
                    cityName: item.cityName,
                    countryCode: item.countryCode,
                    lat: item.lat,
                    lng: item.lng,
                    geoProviderId: item.geoProviderId,
                  }),
              )
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
