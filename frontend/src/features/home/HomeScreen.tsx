import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen, SyncIndicator, TripStub } from '@/components';
import { dataMode, repositories, useAsync, useDataVersion, type TripStop } from '@/data';
import { formatDateRange, todayIso } from '@/lib/dates';
import {
  countdown,
  currentStop,
  formatFlightTime,
  greeting,
  homeFocus,
  nextFlight,
  travelStats,
} from '@/lib/home';
import { flightTitle } from '@/lib/tripDraft';
import { flagEmoji, groupTrips, phaseLine, tripCountries } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/** How many other upcoming trips Home lists before "See all trips". */
const MAX_COMING_UP = 3;

/**
 * Home dashboard: the trip happening now or the next one (countdown), what comes after it,
 * trip ideas without dates and a few lifetime numbers.
 * Reads only through the trip repository, so it works with mock data and the local database.
 * Reminders (KAN-32) and the "Today" suggestion (KAN-45) are added here later.
 */
export function HomeScreen({ firstName, now = new Date() }: { firstName?: string; now?: Date }) {
  const { colors, space } = useTheme();
  const today = todayIso(now);
  const version = useDataVersion();
  const { data, error } = useAsync(async () => {
    const trips = await repositories.trips.listTrips();
    const stops = await Promise.all(trips.map((t) => repositories.trips.listStops(t.id)));
    const stopsByTrip = new Map<string, TripStop[]>(trips.map((t, i) => [t.id, stops[i] ?? []]));
    const focus = homeFocus(trips, today);
    const flights = focus ? await repositories.trips.listFlights(focus.trip.id) : [];
    return { trips, stopsByTrip, focus, flights };
  }, [version, today]);

  const header = (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: space.lg,
        paddingTop: space.sm,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="caption">{greeting(now.getHours())}</AppText>
        <AppText variant="title" numberOfLines={1}>
          {firstName ?? 'Travel App'}
        </AppText>
      </View>
      <SyncIndicator />
    </View>
  );

  if (error) {
    return (
      <Screen header={header}>
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load your trips"
          message="Check your connection, then close and open the app again."
        />
      </Screen>
    );
  }
  if (!data) return <Screen header={header}>{null}</Screen>;

  const { trips, stopsByTrip, focus, flights } = data;
  const countriesOf = (id: string) => tripCountries(stopsByTrip.get(id) ?? []);
  const groups = groupTrips(trips, today);
  const comingUp = (groups.find((g) => g.group === 'upcoming')?.trips ?? []).filter(
    (t) => t.id !== focus?.trip.id,
  );
  const someday = groups.find((g) => g.group === 'someday')?.trips ?? [];
  const stats = travelStats(trips, stopsByTrip, today);
  const openTrip = (id: string) => router.push(`/trip/${id}`);

  if (trips.length === 0) {
    return (
      <Screen header={header}>
        <EmptyState
          icon="airplane-outline"
          title="Plan your next trip"
          message="Create a trip to get your checklist, packing list and reminders."
          actionTitle="Create your first trip"
          onAction={() => router.push('/trip/new')}
        />
      </Screen>
    );
  }

  return (
    <Screen header={header}>
      {focus ? (
        <FocusCard
          focus={focus}
          today={today}
          countries={countriesOf(focus.trip.id)}
          stops={stopsByTrip.get(focus.trip.id) ?? []}
          flights={flights}
          onPress={() => openTrip(focus.trip.id)}
        />
      ) : (
        <Card>
          <AppText variant="caption">Next trip</AppText>
          <AppText variant="heading">No dates planned yet</AppText>
          <AppText variant="body" color={colors.inkSoft}>
            Add dates to a trip to see the countdown here.
          </AppText>
        </Card>
      )}

      {comingUp.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle
            title="Coming up"
            action={comingUp.length > MAX_COMING_UP ? 'See all trips' : undefined}
            onAction={() => router.push('/trips')}
          />
          {comingUp.slice(0, MAX_COMING_UP).map((trip) => (
            <TripStub
              key={trip.id}
              trip={trip}
              countries={countriesOf(trip.id)}
              phase={phaseLine(trip, today)}
              onPress={() => openTrip(trip.id)}
            />
          ))}
        </View>
      ) : null}

      {someday.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle title="Someday" />
          <Card onPress={() => router.push('/trips')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Ionicons name="bulb-outline" size={24} color={colors.bucket} />
              <View style={{ flex: 1, gap: space.xxs }}>
                <AppText variant="label">
                  {someday.length === 1
                    ? '1 trip idea without dates'
                    : `${someday.length} trip ideas without dates`}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {someday.map((t) => t.name).join(', ')}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.inkSoft} />
            </View>
          </Card>
        </View>
      ) : null}

      {stats.trips > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle title="Your travels" />
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <Stat value={stats.trips} label={stats.trips === 1 ? 'trip' : 'trips'} />
              <Stat
                value={stats.countries}
                label={stats.countries === 1 ? 'country' : 'countries'}
              />
              <Stat value={stats.days} label={stats.days === 1 ? 'day away' : 'days away'} />
            </View>
          </Card>
        </View>
      ) : null}

      <Button title="+ Plan a new trip" onPress={() => router.push('/trip/new')} />
      {dataMode === 'mock' ? <AppText variant="caption">Sample data (mock mode).</AppText> : null}
    </Screen>
  );
}

/** The hero card: countdown or "Day 3 of 7", where you are tonight, the next flight. */
function FocusCard({
  focus,
  today,
  countries,
  stops,
  flights,
  onPress,
}: {
  focus: NonNullable<ReturnType<typeof homeFocus>>;
  today: string;
  countries: string[];
  stops: TripStop[];
  flights: Parameters<typeof nextFlight>[0];
  onPress: () => void;
}) {
  const { colors, space } = useTheme();
  const { trip, kind } = focus;
  const count = countdown(focus, today);
  const tonight = kind === 'now' ? currentStop(trip, stops, today) : null;
  const flight = nextFlight(flights, today);

  return (
    <Card onPress={onPress}>
      <AppText variant="caption">{kind === 'now' ? 'You are travelling' : 'Next trip'}</AppText>
      {count ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <AppText variant="title" color={colors.accent}>
            {count.value}
          </AppText>
          <AppText variant="date">{count.label}</AppText>
        </View>
      ) : null}
      <AppText variant="heading">{trip.name}</AppText>
      <AppText variant="date">{formatDateRange(trip.startDate, trip.endDate)}</AppText>
      {countries.length > 0 ? (
        <AppText variant="body">{countries.map(flagEmoji).join(' ')}</AppText>
      ) : null}
      {tonight ? <InfoRow icon="bed-outline" text={`Tonight in ${tonight.cityName}`} /> : null}
      {flight?.departureLocalTime ? (
        <InfoRow
          icon="airplane-outline"
          text={flightTitle(flight)}
          detail={formatFlightTime(flight.departureLocalTime)}
        />
      ) : null}
    </Card>
  );
}

function InfoRow({
  icon,
  text,
  detail,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  detail?: string;
}) {
  const { colors, space } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        borderTopWidth: 1,
        borderColor: colors.border,
        paddingTop: space.sm,
      }}
    >
      <Ionicons name={icon} size={20} color={colors.inkSoft} />
      <View style={{ flex: 1 }}>
        <AppText variant="label">{text}</AppText>
        {detail ? <AppText variant="date">{detail}</AppText> : null}
      </View>
    </View>
  );
}

function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText variant="label">{title}</AppText>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}>
          <AppText variant="label" color={colors.accent}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <AppText variant="heading" color={colors.accent}>
        {value}
      </AppText>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}
