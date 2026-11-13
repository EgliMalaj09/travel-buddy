import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { AppText, Card, Globe, Screen, Stamp, StatTile } from '@/components';
import { findCountry } from '@/data/static/countries';
import { useCountUp, useReducedMotion } from '@/features/finish/motion';
import { newestFirst, WORLD_COUNTRIES } from '@/lib/atlas';
import { stampDate } from '@/lib/finishTrip';
import { useTheme } from '@/theme/ThemeProvider';

import { useAtlas } from './useAtlas';

const countryName = (code: string) => findCountry(code)?.name ?? code;
const angles = [-8, 6, -4, 9, -11, 5];
const isCode = (v: unknown): v is string => typeof v === 'string' && /^[A-Z]{2}$/.test(v);

/** Names in a sentence for the globe's spoken label. */
const listNames = (codes: string[]) => codes.map(countryName).join(', ');

/**
 * Atlas (KAN-49/50/51), the "remember" tab: the dotted globe of visited countries, lifetime
 * numbers, the passport strip (newest first) and the countries list. Tapping a stamp or a
 * country turns the globe to it. `?focus=PT` (from the stamp screen) turns to that country.
 * Everything is read from the phone, so it works offline.
 */
export function AtlasScreen() {
  const { colors, radii, space } = useTheme();
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const params = useLocalSearchParams<{ focus?: string }>();
  const { data } = useAtlas();
  // A tapped stamp or country, remembered with the link it was tapped under: a new link (a new
  // stamp) wins over an older tap.
  const [tap, setTap] = useState<{ code: string; under?: string } | null>(null);
  const picked = tap && tap.under === params.focus ? tap.code : null;
  const setPicked = (code: string) => setTap({ code, under: params.focus });
  // The globe only turns on its own while the Atlas is on screen (saves battery).
  const [shown, setShown] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setShown(true);
      return () => setShown(false);
    }, []),
  );

  const stats = data?.stats ?? { countries: 0, trips: 0, days: 0 };
  // Numbers count up one after another (design guide), at once with reduced motion.
  const countries = useCountUp(stats.countries, 0, reduce);
  const trips = useCountUp(stats.trips, 120, reduce);
  const days = useCountUp(stats.days, 240, reduce);

  if (!data || reduce === null) return <Screen>{null}</Screen>;

  const stamps = newestFirst(data.stamps);
  const visited = data.countries.map((c) => c.code);
  const focus =
    picked ?? (isCode(params.focus) ? params.focus : null) ?? data.here ?? stamps[0]?.countryCode;
  const size = Math.min(width - space.lg * 2, 360);
  const label = visited.length
    ? `Globe. Visited: ${listNames(visited)}.${data.here ? ` You are in ${countryName(data.here)} today.` : ''}`
    : 'Globe. No countries visited yet.';

  return (
    <Screen>
      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
      >
        <AppText variant="title" accessibilityRole="header">
          Atlas
        </AppText>
        <AppText variant="date">
          {stats.countries} of {WORLD_COUNTRIES}
        </AppText>
      </View>

      <Globe
        visited={visited}
        here={data.here}
        focus={focus}
        size={size}
        reduceMotion={reduce}
        autoSpin={shown}
        accessibilityLabel={label}
      />

      {visited.length || data.here ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.lg }}>
          {visited.length ? <Legend color={colors.accent} text="Been there" /> : null}
          {data.here ? (
            <Legend color={colors.sun} text={`Here now · ${countryName(data.here)}`} />
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <StatTile
          compact
          value={String(countries)}
          label={stats.countries === 1 ? 'country' : 'countries'}
        />
        <StatTile compact value={String(trips)} label={stats.trips === 1 ? 'trip' : 'trips'} />
        <StatTile
          compact
          value={String(days)}
          label={stats.days === 1 ? 'day away' : 'days away'}
        />
      </View>

      {stamps.length ? (
        <>
          <View style={{ gap: space.sm }}>
            <AppText variant="heading" accessibilityRole="header">
              Passport
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: space.md,
                paddingVertical: space.sm,
                paddingHorizontal: space.xs,
              }}
            >
              {stamps.map((s, i) => (
                <Pressable
                  key={s.countryCode}
                  accessibilityRole="button"
                  accessibilityLabel={`${countryName(s.countryCode)}, ${stampDate(s.date)}. Show on the globe`}
                  onPress={() => setPicked(s.countryCode)}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
                >
                  <Stamp
                    code={s.countryCode}
                    name={countryName(s.countryCode)}
                    date={stampDate(s.date)}
                    rotate={angles[i % angles.length]}
                    opacity={0.85}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: space.sm }}>
            <AppText variant="heading" accessibilityRole="header">
              Countries
            </AppText>
            <Card>
              {data.countries.map((c) => (
                <Pressable
                  key={c.code}
                  accessibilityRole="button"
                  accessibilityLabel={`${countryName(c.code)}, ${tripsText(c.trips)}. Show on the globe`}
                  accessibilityState={{ selected: focus === c.code }}
                  onPress={() => setPicked(c.code)}
                  style={({ pressed }) => ({
                    minHeight: 56,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View
                    style={{
                      minWidth: 40,
                      paddingVertical: space.xs,
                      borderRadius: radii.sm,
                      backgroundColor: focus === c.code ? colors.accent : colors.background,
                      alignItems: 'center',
                    }}
                  >
                    <AppText variant="date" color={focus === c.code ? colors.onAccent : colors.ink}>
                      {c.code}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">{countryName(c.code)}</AppText>
                    <AppText variant="caption">
                      {tripsText(c.trips)} · last {stampDate(c.lastDate)}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        </>
      ) : (
        <View style={{ gap: space.xs, alignItems: 'center', paddingVertical: space.lg }}>
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            Your first stamp is waiting
          </AppText>
          <AppText variant="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>
            Finish a trip and its country lights up on the globe.
          </AppText>
        </View>
      )}
    </Screen>
  );
}

const tripsText = (n: number) => (n === 1 ? '1 trip' : `${n} trips`);

/** A dot and its meaning, so colour is never the only sign (design guide checklist). */
function Legend({ color, text }: { color: string; text: string }) {
  const { radii, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <View style={{ width: 10, height: 10, borderRadius: radii.pill, backgroundColor: color }} />
      <AppText variant="caption">{text}</AppText>
    </View>
  );
}
