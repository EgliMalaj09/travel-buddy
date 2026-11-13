import { Stack, router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, Screen, StatTile, SunRating } from '@/components';
import { formatDateRange } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

import { useCountUp, useReducedMotion } from './motion';
import { useRecap } from './useRecap';

/** The time between one tile and the next starting to count. */
const STAGGER_MS = 160;

/**
 * Trip recap (KAN-47), right after Finish trip and from a finished trip's page. In the trip's
 * colour (the accent for now), the numbers count up one after another. Everything comes from the
 * phone, so it works offline. "Stamp my passport" goes on to the stamp.
 */
export function TripRecapScreen({ id }: { id: string }) {
  const { colors, radii, space } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { data, loading } = useRecap(id);
  const r = data?.recap;
  const places = useCountUp(r?.placesVisited ?? 0, 0, reduce);
  const photos = useCountUp(r?.photos ?? 0, STAGGER_MS, reduce);
  const spent = useCountUp(r?.spentMinor ?? 0, STAGGER_MS * 2, reduce);
  const countries = useCountUp(r?.countriesTotal ?? 0, STAGGER_MS * 3, reduce);

  if (loading && !data) return null;
  if (!data || !r || data.trip.status !== 'finished') {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState
          icon="ribbon-outline"
          title={data ? 'This trip is not finished yet' : 'Trip not found'}
          message={data ? 'Finish it from its page to see the recap.' : undefined}
        />
      </Screen>
    );
  }
  const { trip, homeCurrency } = data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.accent }}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: colors.accent },
          headerTintColor: colors.onAccent,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
        <AppText variant="date" color={colors.onAccent}>
          TRIP RECAP · {formatDateRange(trip.startDate, trip.endDate)}
        </AppText>
        <AppText variant="title" color={colors.onAccent} accessibilityRole="header">
          {r.days === 1 ? '1 day' : `${r.days} days`} in {trip.name}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <StatTile onAccent value={String(places)} label="places visited" />
          <StatTile onAccent value={String(photos)} label={r.photos === 1 ? 'photo' : 'photos'} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <StatTile
            onAccent
            value={formatMoney(spent, homeCurrency)}
            label={r.spentPending ? `spent · ${r.spentPending} converting…` : 'spent'}
          />
          <StatTile
            onAccent
            value={String(countries)}
            label={r.countriesTotal === 1 ? 'country now' : 'countries now'}
          />
        </View>
        <View
          style={{
            backgroundColor: colors.onAccentSoft,
            borderRadius: radii.lg,
            padding: space.lg,
            gap: space.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <SunRating value={trip.rating ?? 0} size={22} emptyColor={colors.onAccentSoft} />
            <AppText variant="label" color={colors.onAccent}>
              Your rating
            </AppText>
          </View>
          {trip.finishNote ? (
            <AppText variant="note" color={colors.onAccent}>
              “{trip.finishNote}”
            </AppText>
          ) : null}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.lg }}>
        <Button
          kind="secondary"
          title="Stamp my passport"
          onPress={() => router.replace(`/trip/stamp/${trip.id}`)}
        />
      </View>
    </View>
  );
}
