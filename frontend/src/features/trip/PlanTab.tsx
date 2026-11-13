import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, SunRating } from '@/components';
import type { Flight, IsoDate, Place, Trip, TripStop } from '@/data/types';
import { ChecklistCard } from '@/features/checklist/ChecklistCard';
import { ExpensesCard } from '@/features/expenses/ExpensesCard';
import { PackingCard } from '@/features/packing/PackingCard';
import { formatDateRange, formatDay } from '@/lib/dates';
import { canFinish } from '@/lib/finishTrip';
import { placesOn } from '@/lib/places';
import { directionLabels, flightTitle } from '@/lib/tripDraft';
import type { TripTab } from '@/lib/tripTabs';
import { flagEmoji, stopDates } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/** The Plan tab: checklist, packing, places and expenses at a glance (each opens its tab), stops and flights. */
export function PlanTab({
  trip,
  stops,
  flights,
  places,
  today,
  openTab,
}: {
  trip: Trip;
  stops: TripStop[];
  flights: Flight[];
  places: Place[];
  today: IsoDate;
  openTab: (tab: TripTab) => void;
}) {
  const { colors, space } = useTheme();
  const visited = places.filter((p) => p.status === 'visited').length;
  const todays = placesOn(places, today);
  const placesLine = !places.length
    ? 'Plan sights, food and other places for each day.'
    : todays.length
      ? `Today: ${todays.map((p) => p.title).join(', ')}`
      : `${visited} of ${places.length} visited`;

  const finishable = canFinish(trip, today);
  const ended = finishable && !!trip.endDate && trip.endDate < today;
  const finish = () => router.push(`/trip/finish/${trip.id}`);
  // Finish trip (KAN-47): a finished trip shows its rating and recap first; one whose last day is
  // over asks how it was; one happening now offers it at the bottom ("Back home already?").
  const finishCard = (title: string, line: string) => (
    <Card>
      <AppText variant="heading">{title}</AppText>
      <AppText variant="caption">{line}</AppText>
      <Button title="Finish trip" onPress={finish} />
    </Card>
  );

  return (
    <>
      {trip.status === 'finished' ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <AppText variant="heading" style={{ flex: 1 }}>
              Trip finished
            </AppText>
            <SunRating value={trip.rating ?? 0} size={20} />
          </View>
          {trip.finishNote ? <AppText variant="note">“{trip.finishNote}”</AppText> : null}
          <Button
            kind="secondary"
            title="See recap"
            onPress={() => router.push(`/trip/recap/${trip.id}`)}
          />
        </Card>
      ) : ended ? (
        finishCard(`How was ${trip.name}?`, 'Rate it and get your recap and passport stamp.')
      ) : null}

      <ChecklistCard tripId={trip.id} onPress={() => openTab('checklist')} />
      {trip.status !== 'finished' ? (
        <PackingCard tripId={trip.id} onPress={() => openTab('packing')} />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Places, ${places.length} planned`}
        onPress={() => openTab('places')}
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={{ flex: 1, gap: space.xxs }}>
              <AppText variant="label">Places · {places.length} planned</AppText>
              <AppText variant="caption" numberOfLines={1}>
                {placesLine}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.inkSoft} />
          </View>
        </Card>
      </Pressable>

      <ExpensesCard tripId={trip.id} onPress={() => openTab('expenses')} />

      <Card>
        <AppText variant="label">Stops</AppText>
        {stopDates(trip.startDate, stops).map(({ stop, arrive, leave }) => (
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

      {flights.length ? (
        <Card>
          <AppText variant="label">Flights</AppText>
          {flights.map((f) => (
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

      {finishable && !ended
        ? finishCard(
            'Back home already?',
            'Finish the trip to get your recap and your passport stamp.',
          )
        : null}
    </>
  );
}
