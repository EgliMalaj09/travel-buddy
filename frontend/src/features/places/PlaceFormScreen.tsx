import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';

import { ActionSheet, AppText, Button, Chip, EmptyState, Input, Screen } from '@/components';
import {
  PLACE_TITLE_MAX,
  placeInputProblem,
  repositories,
  useAsync,
  type PlaceInput,
} from '@/data';
import type { IsoDate, Place, PlaceCategory, Trip, TripStop } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDay } from '@/lib/dates';
import { categoryLabels, categoryOrder, dayLabel, locationForDay, tripDays } from '@/lib/places';
import { flagEmoji } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Add or edit a planned place (KAN-34). Opened from the trip page ("Add place", a place row) and
 * from the Today card. Params: tripId, and placeId to edit, or day ("2027-04-13") to preselect.
 */
export function PlaceFormScreen() {
  const { tripId, placeId, day } = useLocalSearchParams<{
    tripId: string;
    placeId?: string;
    day?: string;
  }>();
  const { data, loading } = useAsync(async () => {
    const trip = await repositories.trips.getTrip(tripId);
    if (!trip) return null;
    const [stops, places] = await Promise.all([
      repositories.trips.listStops(tripId),
      repositories.places.listPlaces(tripId),
    ]);
    const place = placeId ? (places.find((p) => p.id === placeId) ?? null) : null;
    return { trip, stops, place };
  }, [tripId, placeId]);

  if (loading) return null;
  if (!data || (placeId && !data.place)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon="alert-circle-outline" title="Place not found" />
      </Screen>
    );
  }
  return <PlaceForm trip={data.trip} stops={data.stops} place={data.place} day={day ?? null} />;
}

function PlaceForm({
  trip,
  stops,
  place,
  day,
}: {
  trip: Trip;
  stops: TripStop[];
  place: Place | null;
  day: IsoDate | null;
}) {
  const { colors, space } = useTheme();
  const { user } = useAuth();
  const days = tripDays(trip);
  const [title, setTitle] = useState(place?.title ?? '');
  const [category, setCategory] = useState<PlaceCategory>(place?.category ?? 'other');
  const [plannedDate, setPlannedDate] = useState<IsoDate | null>(
    place ? place.plannedDate : day && days.includes(day) ? day : null,
  );
  const [note, setNote] = useState(place?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  // The day list scrolls sideways: show the chosen day when the form opens.
  const dayScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);

  // Where it is: the city of that day's stop (no paid place search). A place keeps its city
  // when the day is not changed.
  const dayChanged = !place || place.plannedDate !== plannedDate;
  const location = dayChanged
    ? locationForDay(trip, stops, plannedDate)
    : {
        countryCode: place.countryCode,
        cityName: place.cityName,
        lat: place.lat,
        lng: place.lng,
      };

  const input: PlaceInput | null = location
    ? { title, note: note || null, category, plannedDate, ...location }
    : null;

  const save = async () => {
    if (!input) return setError('Add a stop to the trip first.');
    const problem = placeInputProblem(input);
    if (problem) return setError(problem);
    setSaving(true);
    setError(null);
    try {
      if (place) await repositories.places.updatePlace(place.id, input);
      else await repositories.places.createPlace(trip.id, input, user?.id ?? '');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the place.');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!place) return;
    await repositories.places.deletePlace(place.id);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: place ? 'Edit place' : 'Add a place' }} />
      <ActionSheet
        visible={askDelete}
        title={`Delete ${place?.title ?? 'this place'}?`}
        actions={[{ label: 'Delete', destructive: true, onPress: () => void remove() }]}
        onClose={() => setAskDelete(false)}
      />
      <Screen>
        <Input
          label="Name"
          placeholder="Colosseum, Trattoria da Enzo…"
          value={title}
          onChangeText={setTitle}
          maxLength={PLACE_TITLE_MAX}
          autoFocus={!place}
          returnKeyType="done"
        />

        <View style={{ gap: space.xs }}>
          <AppText variant="label">What is it?</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
            {categoryOrder.map((c) => (
              <Chip
                key={c}
                label={categoryLabels[c]}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: space.xs }}>
          <AppText variant="label">Which day?</AppText>
          <ScrollView ref={dayScroll} horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: space.xs }}>
              <Chip
                label="Any day"
                selected={plannedDate === null}
                onPress={() => setPlannedDate(null)}
              />
              {days.map((d, i) => (
                <View
                  key={d}
                  onLayout={(e) => {
                    if (d !== plannedDate || scrolled.current) return;
                    scrolled.current = true;
                    dayScroll.current?.scrollTo({ x: e.nativeEvent.layout.x, animated: false });
                  }}
                >
                  <Chip
                    label={`Day ${i + 1} · ${formatDay(d)}`}
                    selected={plannedDate === d}
                    onPress={() => setPlannedDate(d)}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
          {location?.cityName ? (
            <AppText variant="caption">
              {plannedDate ? dayLabel(trip, plannedDate) : 'Any day'} ·{' '}
              {flagEmoji(location.countryCode)} {location.cityName}
              {dayChanged && plannedDate ? ', where you are that day' : ''}
            </AppText>
          ) : null}
        </View>

        <Input
          label="Note (optional)"
          placeholder="Book tickets online, closed on Mondays…"
          value={note}
          onChangeText={setNote}
          multiline
        />

        {error ? (
          <AppText variant="caption" color={colors.accent}>
            {error}
          </AppText>
        ) : null}

        <Button
          title={saving ? 'Saving…' : place ? 'Save' : 'Add place'}
          disabled={saving}
          onPress={() => void save()}
        />
        {place ? (
          <Button title="Delete place" kind="ghost" onPress={() => setAskDelete(true)} />
        ) : null}
      </Screen>
    </>
  );
}
