import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Card } from '@/components';
import { repositories } from '@/data';
import type { IsoDate, Place, Trip } from '@/data/types';
import { categoryIcons, categoryLabels, groupPlacesByDay } from '@/lib/places';
import { useTheme } from '@/theme/ThemeProvider';

/** The trip page's Places card (KAN-34): planned places day by day, "Any day" last. */
export function TripPlaces({
  trip,
  places,
  today,
}: {
  trip: Trip;
  places: Place[];
  today: IsoDate;
}) {
  const { colors, space } = useTheme();
  const groups = groupPlacesByDay(trip, places);
  const visited = places.filter((p) => p.status === 'visited').length;
  // While the trip is on, "Add" starts on today.
  const onTrip = trip.startDate && trip.endDate && today >= trip.startDate && today <= trip.endDate;
  const add = () =>
    router.push({
      pathname: '/place/edit',
      params: onTrip ? { tripId: trip.id, day: today } : { tripId: trip.id },
    });

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <AppText variant="label">Places</AppText>
          {places.length ? (
            <AppText variant="date">
              {visited} of {places.length} visited
            </AppText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a place"
          onPress={add}
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs, minHeight: 44 }}
        >
          <Ionicons name="add" size={20} color={colors.accent} />
          <AppText variant="label" color={colors.accent}>
            Add
          </AppText>
        </Pressable>
      </View>

      {groups.length === 0 ? (
        <AppText variant="caption">
          Plan sights, food and other places for each day. They show up on Home on the day.
        </AppText>
      ) : null}

      {groups.map((g) => (
        <View key={g.date ?? 'any'} style={{ gap: space.xs }}>
          <AppText variant="date" color={g.date === today ? colors.accent : undefined}>
            {g.date === today ? `Today · ${g.label}` : g.label}
          </AppText>
          {g.places.map((p) => (
            <PlaceRow key={p.id} place={p} />
          ))}
        </View>
      ))}
    </Card>
  );
}

function PlaceRow({ place }: { place: Place }) {
  const { colors, space } = useTheme();
  const visited = place.status === 'visited';
  const open = () =>
    router.push({ pathname: '/place/edit', params: { tripId: place.tripId!, placeId: place.id } });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: visited }}
        accessibilityLabel={`Been to ${place.title}`}
        onPress={() => void repositories.places.setVisited(place.id, !visited)}
        hitSlop={8}
      >
        <Ionicons
          name={visited ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={visited ? colors.accent : colors.inkSoft}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${place.title}`}
        onPress={open}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm }}
      >
        <Ionicons name={categoryIcons[place.category]} size={18} color={colors.inkSoft} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" color={visited ? colors.inkSoft : undefined} numberOfLines={1}>
            {place.title}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {[visited ? 'Been there' : categoryLabels[place.category], place.cityName, place.note]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}
