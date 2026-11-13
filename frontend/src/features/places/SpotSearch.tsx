import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Input } from '@/components';
import type { GeoPlace } from '@/lib/map';
import { flagEmoji } from '@/lib/trips';
import { PlaceSearchError, SEARCH_MIN_LETTERS, searchPlaces } from '@/services/placeSearch';
import { useTheme } from '@/theme/ThemeProvider';

/** Wait this long after the last letter before searching (keeps us inside the provider's fair use). */
const TYPING_PAUSE_MS = 450;

/**
 * "Search for the exact spot" in the place form (KAN-37). Online only; results are kept only
 * while the form is open. `near` is where the traveller is that day, so nearby places come first.
 */
export function SpotSearch({
  near,
  onPick,
}: {
  near: { lat: number; lng: number } | null;
  onPick: (place: GeoPlace) => void;
}) {
  const { colors, space } = useTheme();
  const [text, setText] = useState('');
  // The last answer, with the text it was for: an answer for older text is never shown.
  const [answer, setAnswer] = useState<{
    q: string;
    places: GeoPlace[];
    attribution: string;
    problem: string | null;
  } | null>(null);
  const q = text.trim();
  const long = q.length >= SEARCH_MIN_LETTERS;
  const current = long && answer?.q === q ? answer : null;
  const nearLat = near?.lat;
  const nearLng = near?.lng;

  useEffect(() => {
    if (q.length < SEARCH_MIN_LETTERS) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      const at = nearLat != null && nearLng != null ? { lat: nearLat, lng: nearLng } : null;
      searchPlaces(q, at, abort.signal)
        .then((a) => setAnswer({ q, places: a.places, attribution: a.attribution, problem: null }))
        .catch((e: unknown) => {
          if (abort.signal.aborted) return;
          const problem = e instanceof PlaceSearchError ? e.message : 'Search needs internet.';
          setAnswer({ q, places: [], attribution: '', problem });
        });
    }, TYPING_PAUSE_MS);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [q, nearLat, nearLng]);

  const pick = (place: GeoPlace) => {
    onPick(place);
    setText('');
    setAnswer(null);
  };
  const results = current?.places ?? [];

  return (
    <View style={{ gap: space.xs }}>
      <Input
        label="Search for the exact spot"
        placeholder="Colosseum, Via Roma 12…"
        value={text}
        onChangeText={setText}
        autoCorrect={false}
        returnKeyType="search"
      />
      {long && !current ? <AppText variant="caption">Searching…</AppText> : null}
      {current?.problem ? (
        <AppText variant="caption" color={colors.accent}>
          {current.problem} You can still set the spot on the map.
        </AppText>
      ) : null}
      {current && !current.problem && results.length === 0 ? (
        <AppText variant="caption">Nothing found. Try another name, or set it on the map.</AppText>
      ) : null}
      {results.map((r) => (
        <Pressable
          key={r.geoProviderId}
          accessibilityRole="button"
          accessibilityLabel={`Use ${r.name}`}
          onPress={() => pick(r)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}
        >
          <Ionicons name="location-outline" size={18} color={colors.inkSoft} />
          <View style={{ flex: 1 }}>
            <AppText variant="body" numberOfLines={1}>
              {r.name}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {flagEmoji(r.countryCode)} {r.address ?? r.cityName ?? ''}
            </AppText>
          </View>
        </Pressable>
      ))}
      {results.length && current?.attribution ? (
        <AppText variant="caption">{current.attribution}</AppText>
      ) : null}
    </View>
  );
}
