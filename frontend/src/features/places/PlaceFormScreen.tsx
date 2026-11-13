import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';

import {
  ActionSheet,
  AppText,
  Button,
  Chip,
  EmptyState,
  Input,
  Screen,
  mapSupported,
} from '@/components';
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
import {
  spotFromSearch,
  spotLabel,
  spotOf,
  suggestedCategory,
  PIN_PROVIDER_ID,
  type GeoPlace,
  type Spot,
} from '@/lib/map';
import { categoryLabels, categoryOrder, dayLabel, locationForDay, tripDays } from '@/lib/places';
import { flagEmoji } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

import { SpotPickerModal } from './SpotPickerModal';
import { SpotSearch } from './SpotSearch';

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
  // The exact spot (KAN-37): from the search or the map pin. Null = the city of that day.
  const [spot, setSpot] = useState<Spot | null>(() => spotOf(place));
  const [picking, setPicking] = useState(false);
  // The day list scrolls sideways: show the chosen day when the form opens.
  const dayScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);

  // Without an exact spot, a place is in the city of that day's stop (no paid search). A place
  // keeps its stored city when the day is not changed.
  const keepStored = !!place && place.plannedDate === plannedDate && !spotOf(place);
  const dayChanged = !place || place.plannedDate !== plannedDate;
  const cityLocation = keepStored
    ? {
        countryCode: place.countryCode,
        cityName: place.cityName,
        lat: place.lat,
        lng: place.lng,
      }
    : locationForDay(trip, stops, plannedDate);
  const location = spot
    ? {
        countryCode: spot.countryCode,
        cityName: spot.cityName,
        lat: spot.lat,
        lng: spot.lng,
        address: spot.address,
        geoProviderId: spot.geoProviderId,
      }
    : cityLocation
      ? { ...cityLocation, address: null, geoProviderId: null }
      : null;

  const input: PlaceInput | null = location
    ? { title, note: note || null, category, plannedDate, ...location }
    : null;

  const cityPoint =
    cityLocation?.lat != null && cityLocation.lng != null
      ? { lat: cityLocation.lat, lng: cityLocation.lng }
      : null;
  const usePlace = (found: GeoPlace) => {
    setSpot(spotFromSearch(found));
    if (!title.trim()) setTitle(found.name);
    const suggestion = suggestedCategory(found);
    if (suggestion && category === 'other') setCategory(suggestion);
  };

  const save = async () => {
    if (!input) return setError('Add a stop to the trip first, or set the exact spot.');
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
      {picking ? (
        <SpotPickerModal
          start={spot ?? cityPoint}
          startIsExact={!!spot}
          fallback={{
            countryCode: spot?.countryCode ?? cityLocation?.countryCode ?? '',
            cityName: spot?.cityName ?? cityLocation?.cityName ?? null,
          }}
          onDone={(next) => {
            setSpot(next);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
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
          {!spot && location?.cityName ? (
            <AppText variant="caption">
              {plannedDate ? dayLabel(trip, plannedDate) : 'Any day'} ·{' '}
              {flagEmoji(location.countryCode)} {location.cityName}
              {dayChanged && plannedDate ? ', where you are that day' : ''}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: space.sm }}>
          <AppText variant="label">Exact spot (optional)</AppText>
          {spot ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="location" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={2}>
                  {spotLabel(spot)}
                </AppText>
                <AppText variant="caption">
                  {flagEmoji(spot.countryCode)}{' '}
                  {spot.geoProviderId === PIN_PROVIDER_ID ? 'Set on the map' : 'From the search'}
                </AppText>
              </View>
              <Button title="Remove" kind="ghost" onPress={() => setSpot(null)} />
            </View>
          ) : (
            <AppText variant="caption">
              Without it, the place shows the city of that day and is not on the map.
            </AppText>
          )}
          <SpotSearch near={spot ?? cityPoint} onPick={usePlace} />
          {mapSupported ? (
            <Button
              title={spot ? 'Move the pin on the map' : 'Set it on the map'}
              kind="secondary"
              onPress={() => setPicking(true)}
            />
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
