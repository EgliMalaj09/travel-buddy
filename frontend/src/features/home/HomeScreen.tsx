import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen, SyncIndicator, TripStub } from '@/components';
import { dataMode, repositories, useAsync, useDataVersion, type TripStop } from '@/data';
import { formatDateRange, todayIso } from '@/lib/dates';
import {
  countdown,
  formatFlightTime,
  greeting,
  homeFocus,
  nextFlight,
  travelStats,
} from '@/lib/home';
import { formatReminderTime, planReminders, type PlannedReminder } from '@/lib/reminders';
import { todayPlan, type TodayItem } from '@/lib/today';
import { flightTitle } from '@/lib/tripDraft';
import { flagEmoji, groupTrips, phaseLine, tripCountries } from '@/lib/trips';
import { loadReminderInput } from '@/features/reminders/reminderInput';
import { useUserSettings } from '@/services/userSettings';
import {
  openNotificationSettings,
  reminderPermission,
  type ReminderPermission,
} from '@/services/reminders';
import { useTheme } from '@/theme/ThemeProvider';

/** How many other upcoming trips Home lists before "See all trips". */
const MAX_COMING_UP = 3;
/** How many of the next reminders Home shows. */
const MAX_REMINDERS = 2;

/**
 * Home dashboard: the trip happening now or the next one (countdown), what comes after it,
 * trip ideas without dates and a few lifetime numbers.
 * Reads only through the trip repository, so it works with mock data and the local database.
 * For a trip happening now, the "Today" card (KAN-45); for any trip with dates, the next
 * reminders (KAN-32).
 */
export function HomeScreen({ firstName, now = new Date() }: { firstName?: string; now?: Date }) {
  const { colors, space } = useTheme();
  const today = todayIso(now);
  const version = useDataVersion();
  // Plan the shown reminders again when the Settings screen changes them.
  const reminderSettings = useUserSettings((s) => s.settings);
  const { data, error } = useAsync(async () => {
    const trips = await repositories.trips.listTrips();
    const stops = await Promise.all(trips.map((t) => repositories.trips.listStops(t.id)));
    const stopsByTrip = new Map<string, TripStop[]>(trips.map((t, i) => [t.id, stops[i] ?? []]));
    const focus = homeFocus(trips, today);
    const flights = focus ? await repositories.trips.listFlights(focus.trip.id) : [];
    // Today's planned places (KAN-34). Only needed while the trip is happening.
    const places = focus?.kind === 'now' ? await repositories.places.listPlaces(focus.trip.id) : [];
    const reminders = planReminders({ ...(await loadReminderInput()), now: new Date() });
    const permission = await reminderPermission();
    return { trips, stopsByTrip, focus, flights, places, reminders, permission };
  }, [version, today, reminderSettings]);

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

  const { trips, stopsByTrip, focus, flights, places, reminders, permission } = data;
  const todayItems =
    focus?.kind === 'now'
      ? todayPlan(focus.trip, stopsByTrip.get(focus.trip.id) ?? [], flights, today, places)
      : [];
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

      {todayItems.length > 0 && focus ? (
        <TodayCard
          items={todayItems}
          onOpenPlace={(placeId) =>
            router.push({ pathname: '/place/edit', params: { tripId: focus.trip.id, placeId } })
          }
        />
      ) : null}

      {reminders.length > 0 ? (
        <RemindersCard reminders={reminders} permission={permission} now={now} />
      ) : null}

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

/** The hero card: countdown or "Day 3 of 7" and the next flight. */
function FocusCard({
  focus,
  today,
  countries,
  flights,
  onPress,
}: {
  focus: NonNullable<ReturnType<typeof homeFocus>>;
  today: string;
  countries: string[];
  flights: Parameters<typeof nextFlight>[0];
  onPress: () => void;
}) {
  const { colors, space } = useTheme();
  const { trip, kind } = focus;
  const count = countdown(focus, today);
  // While travelling, tonight's city and today's flights are on the Today card instead.
  const next = nextFlight(flights, today);
  const flight = kind === 'now' && next?.departureLocalTime?.startsWith(today) ? null : next;

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

/** "Today" (KAN-45): what the trip knows about today, with today's planned places (KAN-34). */
function TodayCard({
  items,
  onOpenPlace,
}: {
  items: TodayItem[];
  onOpenPlace: (placeId: string) => void;
}) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle title="Today" />
      <Card>
        {items.map((item, i) => (
          <InfoRow
            key={item.key}
            icon={item.icon}
            text={item.text}
            detail={item.detail}
            first={i === 0}
            onPress={item.placeId ? () => onOpenPlace(item.placeId!) : undefined}
          />
        ))}
      </Card>
    </View>
  );
}

/** The next reminders, or how to turn them on. */
function RemindersCard({
  reminders,
  permission,
  now,
}: {
  reminders: PlannedReminder[];
  permission: ReminderPermission;
  now: Date;
}) {
  const { colors, space } = useTheme();
  const note =
    permission === 'denied'
      ? 'Notifications are off for this app.'
      : permission === 'unsupported'
        ? 'Reminders come on the phone app.'
        : permission === 'notAsked'
          ? 'Turn on notifications to get these.'
          : null;
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle
        title="Reminders"
        action={permission === 'denied' ? 'Turn on' : undefined}
        onAction={openNotificationSettings}
      />
      <Card>
        {reminders.slice(0, MAX_REMINDERS).map((r, i) => (
          <InfoRow
            key={r.id}
            icon={r.kind.startsWith('flight') ? 'airplane-outline' : 'notifications-outline'}
            text={r.title}
            detail={formatReminderTime(r.at, now)}
            first={i === 0}
          />
        ))}
        {note ? (
          <AppText variant="caption" color={colors.inkSoft}>
            {note}
          </AppText>
        ) : null}
      </Card>
    </View>
  );
}

function InfoRow({
  icon,
  text,
  detail,
  first = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  detail?: string;
  /** The first row of a card has no line above it. */
  first?: boolean;
  onPress?: () => void;
}) {
  const { colors, space } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        borderTopWidth: first ? 0 : 1,
        borderColor: colors.border,
        paddingTop: first ? 0 : space.sm,
      }}
    >
      <Ionicons name={icon} size={20} color={colors.inkSoft} />
      <View style={{ flex: 1 }}>
        <AppText variant="label">{text}</AppText>
        {detail ? <AppText variant="date">{detail}</AppText> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} /> : null}
    </Pressable>
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
