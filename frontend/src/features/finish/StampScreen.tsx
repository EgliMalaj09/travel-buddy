import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, PassportGrid, Screen, Stamp } from '@/components';
import { findCountry } from '@/data/static/countries';
import { stampDate } from '@/lib/finishTrip';
import { useTheme } from '@/theme/ThemeProvider';

import { PARTY_MS, useReducedMotion } from './motion';
import { useRecap } from './useRecap';

const countryName = (code: string) => findCountry(code)?.name ?? code;

/** Names in a sentence: "Italy", "Italy and France", "Italy, France and Spain". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** A new stamp lands: big and turned, then pressed down (design guide "stamp", 620 ms). */
function LandingStamp({
  code,
  date,
  delay,
  reduce,
}: {
  code: string;
  date: string;
  delay: number;
  reduce: boolean;
}) {
  const [p] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) {
      p.setValue(1);
      return;
    }
    const a = Animated.timing(p, {
      toValue: 1,
      duration: PARTY_MS,
      delay,
      easing: Easing.bezier(0.2, 1.4, 0.4, 1),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [p, delay, reduce]);
  return (
    <Animated.View
      style={{
        opacity: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
        transform: [
          { scale: p.interpolate({ inputRange: [0, 1], outputRange: [3.2, 1] }) },
          { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['-28deg', '-9deg'] }) },
        ],
      }}
    >
      <Stamp code={code} name={countryName(code)} date={date} />
    </Animated.View>
  );
}

/**
 * The passport stamp (KAN-47): each country this trip added lands in the passport, with the
 * stamps from earlier trips. A trip to countries already stamped says so. "Done" goes back to
 * where Finish trip was opened (the trip page or Home).
 */
export function StampScreen({ id }: { id: string }) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { data, loading } = useRecap(id);

  if ((loading && !data) || reduce === null) return null;
  if (!data || data.trip.status !== 'finished') {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState
          icon="ribbon-outline"
          title={data ? 'This trip is not finished yet' : 'Trip not found'}
        />
      </Screen>
    );
  }
  const { recap, stamps } = data;
  const fresh = recap.newCountries;
  const title = fresh.length
    ? `${joinNames(fresh.map(countryName))} ${fresh.length === 1 ? 'is' : 'are'} in your passport`
    : `${joinNames(recap.countries.map(countryName))} ${recap.countries.length === 1 ? 'was' : 'were'} already in your passport`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: '' }} />
      <Screen>
        <AppText variant="date">
          {recap.countriesTotal === 1 ? '1 country' : `${recap.countriesTotal} countries`} in your
          passport
        </AppText>
        <AppText variant="title" accessibilityRole="header" accessibilityLiveRegion="polite">
          {title}
        </AppText>
        <PassportGrid
          stamps={stamps.map((s) => ({
            code: s.countryCode,
            name: countryName(s.countryCode),
            date: stampDate(s.date),
          }))}
          renderStamp={(s) => {
            const i = fresh.indexOf(s.code);
            return i < 0 ? null : (
              <LandingStamp
                code={s.code}
                date={s.date}
                delay={400 + i * (PARTY_MS / 2)}
                reduce={reduce}
              />
            );
          }}
        />
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          Every finished trip adds a stamp for each new country.
        </AppText>
      </Screen>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.lg }}>
        <Button title="Done" onPress={() => router.back()} />
      </View>
    </View>
  );
}
