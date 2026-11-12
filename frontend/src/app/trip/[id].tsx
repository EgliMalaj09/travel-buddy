import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ActionSheet, AppText, Card, EmptyState, Screen } from '@/components';
import { repositories, useAsync, useDataVersion } from '@/data';
import { formatDateRange, formatDay, todayIso } from '@/lib/dates';
import { TripPlaces } from '@/features/places/TripPlaces';
import { activityLabels, directionLabels, flightTitle } from '@/lib/tripDraft';
import { flagEmoji, phaseLine, stopDates } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/** Trip screen shell: header, stops, places, flights, and the ••• menu. Tabs come with KAN-53. */
export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, space } = useTheme();
  const today = todayIso();
  // Which sheet is open: the ••• menu or the delete question. A sheet instead of Alert.alert,
  // because Alert.alert with buttons does nothing on web.
  const [sheet, setSheet] = useState<'menu' | 'delete' | null>(null);
  const version = useDataVersion();
  const { data, loading } = useAsync(async () => {
    const trip = await repositories.trips.getTrip(id);
    const [stops, flights, places] = trip
      ? await Promise.all([
          repositories.trips.listStops(trip.id),
          repositories.trips.listFlights(trip.id),
          repositories.places.listPlaces(trip.id),
        ])
      : [[], [], []];
    return { trip, stops, flights, places };
  }, [id, version]);

  if (loading && !data) return null;
  const trip = data?.trip;
  if (!trip) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Trip not found" />
      </Screen>
    );
  }

  // T6: confirm, then delete (soft delete, synced).
  const deleteTrip = async () => {
    await repositories.trips.deleteTrip(trip.id);
    router.back();
  };
  // Opening the second sheet right after the first one closes needs a short pause on iOS.
  const askDelete = () => setTimeout(() => setSheet('delete'), 300);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Trip options"
              onPress={() => setSheet('menu')}
              hitSlop={12}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <ActionSheet
        visible={sheet === 'menu'}
        title={trip.name}
        actions={[
          { label: 'Edit trip', onPress: () => router.push(`/trip/edit/${trip.id}`) },
          { label: 'Delete trip', destructive: true, onPress: askDelete },
        ]}
        onClose={() => setSheet(null)}
      />
      <ActionSheet
        visible={sheet === 'delete'}
        title={`Delete ${trip.name}?`}
        message="Its places, photos, checklist and expenses will be deleted too."
        actions={[{ label: 'Delete', destructive: true, onPress: () => void deleteTrip() }]}
        onClose={() => setSheet(null)}
      />
      <Screen>
        <View style={{ gap: space.xs }}>
          <AppText variant="title">{trip.name}</AppText>
          <AppText variant="date">
            {trip.startDate ? formatDateRange(trip.startDate, trip.endDate) : 'Someday'}
          </AppText>
          {phaseLine(trip, today) ? (
            <AppText variant="label" color={colors.accent}>
              {phaseLine(trip, today)}
            </AppText>
          ) : null}
          {trip.activities.length ? (
            <AppText variant="caption">
              {trip.activities.map((a) => activityLabels[a]).join(' · ')}
            </AppText>
          ) : null}
        </View>

        <Card>
          <AppText variant="label">Stops</AppText>
          {stopDates(trip.startDate, data?.stops ?? []).map(({ stop, arrive, leave }) => (
            <View
              key={stop.id}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}
            >
              <AppText variant="body">
                {flagEmoji(stop.countryCode)} {stop.cityName}
              </AppText>
              <AppText variant="date">
                {arrive
                  ? formatDateRange(arrive, leave)
                  : stop.nights === 1
                    ? '1 night'
                    : `${stop.nights} nights`}
              </AppText>
            </View>
          ))}
        </Card>

        <TripPlaces trip={trip} places={data?.places ?? []} today={today} />

        {data?.flights.length ? (
          <Card>
            <AppText variant="label">Flights</AppText>
            {data.flights.map((f) => (
              <View key={f.id} style={{ gap: space.xxs }}>
                <AppText variant="body">{flightTitle(f)}</AppText>
                <AppText variant="date">
                  {[
                    directionLabels[f.direction],
                    f.departureLocalTime
                      ? `${formatDay(f.departureLocalTime.slice(0, 10))} ${f.departureLocalTime.slice(11, 16)}`
                      : null,
                    f.seat ? `Seat ${f.seat}` : null,
                    f.bookingCode ? `Booking ${f.bookingCode}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
            ))}
          </Card>
        ) : null}
      </Screen>
    </>
  );
}
