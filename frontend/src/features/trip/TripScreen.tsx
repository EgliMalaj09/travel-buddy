import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet, EmptyState, Screen, TabRow } from '@/components';
import { repositories, useAsync, useDataVersion } from '@/data';
import { ChecklistItemSheet } from '@/features/checklist/ChecklistItemSheet';
import { ChecklistList } from '@/features/checklist/ChecklistList';
import { TripPlaces } from '@/features/places/TripPlaces';
import { todayIso } from '@/lib/dates';
import {
  openingTripTab,
  parseTripTab,
  tripTabLabels,
  tripTabs,
  type TripTab,
} from '@/lib/tripTabs';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/theme/ThemeProvider';

import { PlanTab } from './PlanTab';
import { TripHeader } from './TripHeader';

const tabItems = tripTabs.map((key) => ({ key, label: tripTabLabels[key] }));

/** Size of the round quick-add button, and the space kept free under the content for it. */
const fabSize = 56;

/**
 * The trip page (KAN-53): one home for a trip. Header, then tabs for Plan, Places, Checklist,
 * Photos and Expenses, and a quick-add button. The ••• menu edits or deletes the trip.
 * `linkTab` comes from `?tab=` (reminders open the Checklist tab).
 */
export function TripScreen({ id, linkTab }: { id: string; linkTab?: unknown }) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const today = todayIso();
  const lastTab = useUiStore((s) => s.tripTabs[id]);
  const setTripTab = useUiStore((s) => s.setTripTab);
  const [tab, setTab] = useState<TripTab>(() => openingTripTab(linkTab, lastTab));
  // Which sheet is open. A sheet instead of Alert.alert, because Alert.alert with buttons does
  // nothing on web.
  const [sheet, setSheet] = useState<'menu' | 'delete' | 'add' | 'checklistItem' | null>(null);

  const openTab = setTab;
  // A new link to the same page (a reminder tapped while it is open) moves to that tab.
  const [seenLinkTab, setSeenLinkTab] = useState(linkTab);
  if (linkTab !== seenLinkTab) {
    setSeenLinkTab(linkTab);
    const next = parseTripTab(linkTab);
    if (next) setTab(next);
  }
  // Remember the tab for this trip, so coming back from a place or the trip editor keeps it.
  useEffect(() => setTripTab(id, tab), [id, tab, setTripTab]);

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
  const stops = data?.stops ?? [];
  const places = data?.places ?? [];

  // T6: confirm, then delete (soft delete, synced).
  const deleteTrip = async () => {
    await repositories.trips.deleteTrip(trip.id);
    router.back();
  };
  // Opening a second sheet right after the first one closes needs a short pause on iOS.
  const then = (next: typeof sheet) => () => setTimeout(() => setSheet(next), 300);
  const onTrip =
    !!trip.startDate && !!trip.endDate && today >= trip.startDate && today <= trip.endDate;
  const addPlace = () =>
    router.push({
      pathname: '/place/edit',
      params: onTrip ? { tripId: trip.id, day: today } : { tripId: trip.id },
    });

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
          { label: 'Delete trip', destructive: true, onPress: then('delete') },
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
      <ActionSheet
        visible={sheet === 'add'}
        title="Add to this trip"
        message="Photos, notes and expenses come in the next updates."
        actions={[
          { label: onTrip ? 'Place for today' : 'Place', onPress: addPlace },
          { label: 'Checklist item', onPress: then('checklistItem') },
        ]}
        onClose={() => setSheet(null)}
      />
      {sheet === 'checklistItem' ? (
        <ChecklistItemSheet
          initial={null}
          onSave={async (edit) => {
            await repositories.checklist.addItem(trip.id, edit);
            openTab('checklist');
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      <View style={{ flex: 1 }}>
        <Screen>
          <TripHeader trip={trip} stops={stops} today={today} />
          <TabRow tabs={tabItems} selected={tab} onSelect={openTab} />

          {tab === 'plan' ? (
            <PlanTab
              trip={trip}
              stops={stops}
              flights={data?.flights ?? []}
              places={places}
              today={today}
              openTab={openTab}
            />
          ) : tab === 'places' ? (
            <TripPlaces trip={trip} places={places} today={today} />
          ) : tab === 'checklist' ? (
            <ChecklistList tripId={trip.id} />
          ) : tab === 'photos' ? (
            <EmptyState
              icon="images-outline"
              title="Photos and notes come soon"
              message="You will add photos and notes for each day here, and they will stay on this phone even with no signal."
            />
          ) : (
            <EmptyState
              icon="wallet-outline"
              title="Expenses come soon"
              message="You will track what you spend on this trip here, in any currency."
            />
          )}

          {/* Keeps the last row clear of the quick-add button. */}
          <View style={{ height: fabSize }} />
        </Screen>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quick add"
          onPress={() => setSheet('add')}
          style={{
            position: 'absolute',
            right: space.lg,
            bottom: insets.bottom + space.lg,
            width: fabSize,
            height: fabSize,
            borderRadius: fabSize / 2,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={28} color={colors.onAccent} />
        </Pressable>
      </View>
    </>
  );
}
