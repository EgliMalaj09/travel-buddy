import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Card, EmptyState, Screen, SyncIndicator } from '@/components';
import { dataMode, repositories, useAsync, useDataVersion } from '@/data';
import { formatDateRange, todayIso } from '@/lib/dates';
import { groupTrips, phaseLine } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/** Home: the current or next trip (countdown card). Full version in KAN-32 and KAN-45. */
export default function HomeScreen() {
  const { colors, space } = useTheme();
  const today = todayIso();
  const version = useDataVersion();
  const { data: trips = [] } = useAsync(() => repositories.trips.listTrips(), [version]);
  const groups = groupTrips(trips, today);
  const focus =
    groups.find((g) => g.group === 'now')?.trips[0] ??
    groups.find((g) => g.group === 'upcoming')?.trips[0];

  return (
    <Screen
      header={
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: space.lg,
            paddingTop: space.sm,
          }}
        >
          <AppText variant="title">Travel App</AppText>
          <SyncIndicator />
        </View>
      }
    >
      {focus ? (
        <Card onPress={() => router.push(`/trip/${focus.id}`)}>
          <AppText variant="caption">
            {phaseLine(focus, today).startsWith('Day') ? 'You are travelling' : 'Next trip'}
          </AppText>
          <AppText variant="title" color={colors.accent}>
            {phaseLine(focus, today)}
          </AppText>
          <AppText variant="heading">{focus.name}</AppText>
          <AppText variant="date">{formatDateRange(focus.startDate, focus.endDate)}</AppText>
        </Card>
      ) : (
        <EmptyState
          icon="airplane-outline"
          title="Plan your next trip"
          message="Create a trip to get your checklist, packing list and reminders."
          actionTitle="Create your first trip"
          onAction={() => router.push('/trip/new')}
        />
      )}
      {dataMode === 'mock' ? <AppText variant="caption">Sample data (mock mode).</AppText> : null}
    </Screen>
  );
}
