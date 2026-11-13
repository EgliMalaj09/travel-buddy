import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, Input, Screen, Stamp, SunRating } from '@/components';
import { FINISH_NOTE_MAX, repositories, useAsync, useDataVersion } from '@/data';
import { findCountry } from '@/data/static/countries';
import { todayIso } from '@/lib/dates';
import { canFinish, ratingWord, stampDate } from '@/lib/finishTrip';
import { tripCountries } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Finish trip (KAN-47): "How was <trip>?" with five suns and one optional line to remember it by.
 * Saved on the phone first (works offline), then the recap opens. Opened from Home the day after
 * the trip, or by hand from the trip page once the trip has started.
 */
export function FinishTripScreen({ id }: { id: string }) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const today = todayIso();
  const version = useDataVersion();
  const { data, loading } = useAsync(async () => {
    const trip = await repositories.trips.getTrip(id);
    const stops = trip ? await repositories.trips.listStops(id) : [];
    return { trip, stops };
  }, [id, version]);

  // A trip opened again keeps its rating and note, so they come back here.
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Finished on another phone, or Back from the recap: show the recap instead.
  const finishedElsewhere = data?.trip?.status === 'finished' && !saving;
  useEffect(() => {
    if (finishedElsewhere) router.replace(`/trip/recap/${id}`);
  }, [finishedElsewhere, id]);

  if (loading && !data) return null;
  const trip = data?.trip;
  if (!trip || (trip.status !== 'finished' && !canFinish(trip, today))) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState
          icon="calendar-outline"
          title={trip ? 'Not ready to finish yet' : 'Trip not found'}
          message={
            trip
              ? 'A trip can be finished once it has dates and its first day has come.'
              : undefined
          }
        />
      </Screen>
    );
  }
  if (trip.status === 'finished') return null;

  const shownRating = rating ?? trip.rating ?? 0;
  const shownNote = note ?? trip.finishNote ?? '';
  const code = tripCountries(data.stops)[0];
  const country = code ? (findCountry(code)?.name ?? code) : null;

  const finish = async () => {
    if (!shownRating || saving) return;
    setSaving(true);
    setProblem(null);
    try {
      await repositories.trips.finishTrip(trip.id, { rating: shownRating, note: shownNote });
      router.replace(`/trip/recap/${trip.id}`);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'The trip was not finished. Please try again.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Finish trip' }} />
      <Screen>
        {code && country ? (
          <View style={{ alignItems: 'center' }}>
            <Stamp
              code={code}
              name={country}
              date={stampDate(trip.endDate!)}
              size={120}
              rotate={-9}
              opacity={0.25}
            />
          </View>
        ) : null}
        <AppText variant="title" style={{ textAlign: 'center' }} accessibilityRole="header">
          How was {trip.name}?
        </AppText>
        <SunRating
          value={shownRating}
          onChange={(r) => {
            setRating(r);
            setProblem(null);
          }}
        />
        <AppText variant="date" style={{ textAlign: 'center', minHeight: 20 }}>
          {shownRating ? ratingWord(shownRating) : 'Tap a sun'}
        </AppText>
        <Input
          label="One line to remember it by (optional)"
          placeholder="Custard tarts, tiles and too many hills."
          value={shownNote}
          onChangeText={setNote}
          maxLength={FINISH_NOTE_MAX}
          multiline
        />
        {problem ? (
          <AppText variant="caption" color={colors.accent} accessibilityLiveRegion="polite">
            {problem}
          </AppText>
        ) : null}
      </Screen>
      {/* The main action in the thumb zone. */}
      <View
        style={{
          paddingHorizontal: space.lg,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.lg,
          backgroundColor: colors.background,
        }}
      >
        <Button
          title={saving ? 'Finishing…' : 'Finish trip'}
          disabled={!shownRating || saving}
          onPress={() => void finish()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
