import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { AppMap, AppMapMarker, AppText, Button, Card, Chip, mapSupported } from '@/components';
import { repositories } from '@/data';
import type { IsoDate, Place, Trip, TripStop } from '@/data/types';
import {
  MAP_ATTRIBUTION,
  MAP_ATTRIBUTION_URL,
  openingView,
  placePins,
  placesWithoutSpot,
  stopPins,
  type MapDayFilter,
} from '@/lib/map';
import { categoryLabels, dayLabel, tripDays } from '@/lib/places';
import { useTheme } from '@/theme/ThemeProvider';

import { PlacePin, StopDot } from './PlacePin';

/**
 * The trip map (KAN-37): the trip's places with an exact spot as pins (planned outlined, visited
 * filled), the stops as small flags, a day filter, and the places that only have their city.
 * Used on the trip page's Map tab and full screen (`/trip/map/<id>`).
 */
export function TripMap({
  trip,
  stops,
  places,
  today,
  fullScreen,
}: {
  trip: Trip;
  stops: TripStop[];
  places: Place[];
  today: IsoDate;
  fullScreen?: boolean;
}) {
  const { colors, space } = useTheme();
  const live = places.filter((p) => !p.deletedAt);
  const onTrip =
    !!trip.startDate && !!trip.endDate && today >= trip.startDate && today <= trip.endDate;
  const [day, setDay] = useState<MapDayFilter>(() =>
    onTrip && live.some((p) => p.plannedDate === today) ? today : 'all',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pins = placePins(live, day);
  const missing = placesWithoutSpot(live, day);
  const stopMarks = stopPins(stops);
  const view = openingView(
    pins.map((p) => p.lngLat),
    stopMarks.map((s) => s.lngLat),
  );
  const selected = live.find((p) => p.id === selectedId && pins.some((pin) => pin.id === p.id));

  // Only days that have places, so the row stays short on long trips.
  const usedDays = tripDays(trip).filter((d) => live.some((p) => p.plannedDate === d));
  const hasAnyDay = live.some((p) => p.plannedDate === null);
  const pickDay = (next: MapDayFilter) => {
    setDay(next);
    setSelectedId(null);
  };
  const edit = (place: Place) =>
    router.push({ pathname: '/place/edit', params: { tripId: trip.id, placeId: place.id } });

  const map = (
    <AppMap
      view={view}
      fill={fullScreen}
      height={fullScreen ? undefined : 360}
      onPress={() => setSelectedId(null)}
    >
      {stopMarks.map((s) => (
        <AppMapMarker key={`stop-${s.id}`} id={`stop-${s.id}`} lngLat={s.lngLat}>
          <StopDot cityName={s.cityName} />
        </AppMapMarker>
      ))}
      {pins.map((p) => (
        <AppMapMarker key={p.id} id={p.id} lngLat={p.lngLat} onPress={() => setSelectedId(p.id)}>
          <PlacePin status={p.status} category={p.category} selected={p.id === selectedId} />
        </AppMapMarker>
      ))}
    </AppMap>
  );

  return (
    <View style={{ gap: space.md, flex: fullScreen ? 1 : undefined }}>
      {usedDays.length || hasAnyDay ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <Chip label="All days" selected={day === 'all'} onPress={() => pickDay('all')} />
            {usedDays.map((d) => (
              <Chip
                key={d}
                label={d === today ? `Today · ${dayLabel(trip, d)}` : dayLabel(trip, d)}
                selected={day === d}
                onPress={() => pickDay(d)}
              />
            ))}
            {hasAnyDay ? (
              <Chip label="Any day" selected={day === 'any'} onPress={() => pickDay('any')} />
            ) : null}
          </View>
        </ScrollView>
      ) : null}

      {map}

      {mapSupported ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }}
        >
          <Legend tone={colors.planned} label="Planned" />
          <Legend tone={colors.accent} label="Been there" filled />
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(MAP_ATTRIBUTION_URL)}
            style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
          >
            <AppText variant="caption" numberOfLines={2} style={{ textAlign: 'right' }}>
              {MAP_ATTRIBUTION}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {selected ? (
        <Card>
          <AppText variant="label">{selected.title}</AppText>
          <AppText variant="caption">
            {[
              categoryLabels[selected.category],
              selected.plannedDate ? dayLabel(trip, selected.plannedDate) : 'Any day',
              selected.address ?? selected.cityName,
            ]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                title={selected.status === 'visited' ? 'Not yet' : 'Been there'}
                kind="ghost"
                onPress={() =>
                  void repositories.places.setVisited(selected.id, selected.status !== 'visited')
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Edit" onPress={() => edit(selected)} />
            </View>
          </View>
        </Card>
      ) : null}

      {!fullScreen && mapSupported ? (
        <Button
          title="Full screen map"
          kind="ghost"
          onPress={() => router.push({ pathname: '/trip/map/[id]', params: { id: trip.id } })}
        />
      ) : null}

      {fullScreen ? null : live.length === 0 ? (
        <AppText variant="caption">
          Add places to this trip and give them their exact spot. They show up here as pins.
        </AppText>
      ) : missing.length ? (
        <Card>
          <AppText variant="label">Not on the map yet</AppText>
          <AppText variant="caption">
            {missing.length === 1 ? 'This place only has' : 'These places only have'} the city of
            that day. Tap one to set its exact spot.
          </AppText>
          {missing.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`Set the exact spot of ${p.title}`}
              onPress={() => edit(p)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}
            >
              <Ionicons name="location-outline" size={18} color={colors.inkSoft} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={1}>
                  {p.title}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {[p.plannedDate ? dayLabel(trip, p.plannedDate) : 'Any day', p.cityName]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function Legend({ tone, label, filled }: { tone: string; label: string; filled?: boolean }) {
  const { colors, space, fontSizes } = useTheme();
  const size = fontSizes.xs;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: tone,
          backgroundColor: filled ? tone : colors.surface,
        }}
      />
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}
