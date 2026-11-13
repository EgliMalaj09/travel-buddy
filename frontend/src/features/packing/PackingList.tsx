import { useState } from 'react';
import { View } from 'react-native';

import { ActionSheet, AppText, Button, Card, EmptyState } from '@/components';
import { repositories, type ChecklistItem, type PackingCategory } from '@/data';
import { todayIso } from '@/lib/dates';
import { packingTitle } from '@/lib/packing';
import { useTheme } from '@/theme/ThemeProvider';

import { ChecklistItemRow } from '../checklist/ChecklistItemRow';
import { ChecklistItemSheet } from '../checklist/ChecklistItemSheet';
import { usePacking } from './usePacking';
import { WeatherCard } from './WeatherCard';

/**
 * The trip's packing list (KAN-28), in the trip page's Packing tab: made on the phone from the
 * nights, activities, flights and the weather, grouped, with how many of each. Tick what is in
 * the bag, add your own, edit, delete. Works offline; syncs like the checklist.
 */
export function PackingList({ tripId }: { tripId: string }) {
  const { colors, radii, space } = useTheme();
  const today = todayIso();
  const { data, loading, error } = usePacking(tripId);
  const [menuFor, setMenuFor] = useState<ChecklistItem | null>(null);
  const [editing, setEditing] = useState<ChecklistItem | 'new' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const run = (action: Promise<void>) =>
    action.catch((e: unknown) =>
      setProblem(e instanceof Error ? e.message : 'Something went wrong. Please try again.'),
    );

  if (loading && !data) return null;
  if (error || !data) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title={error ? 'The packing list could not load' : 'Trip not found'}
        message={error?.message}
      />
    );
  }
  const { view } = data;
  const progress = view.total ? view.packed / view.total : 0;
  const allPacked = view.total > 0 && view.packed === view.total;
  const row = (item: ChecklistItem) => (
    <ChecklistItemRow
      key={item.id}
      item={item}
      today={today}
      onToggle={(done) => void run(repositories.checklist.setDone(item.id, done))}
      onMenu={() => setMenuFor(item)}
    />
  );

  return (
    <>
      <ActionSheet
        visible={!!menuFor}
        title={menuFor ? packingTitle(menuFor) : ''}
        actions={[
          { label: 'Edit', onPress: () => setTimeout(() => setEditing(menuFor), 300) },
          {
            label: 'Delete',
            destructive: true,
            onPress: () => menuFor && void run(repositories.checklist.deleteItems([menuFor.id])),
          },
        ]}
        onClose={() => setMenuFor(null)}
      />
      {editing ? (
        <ChecklistItemSheet
          type="packing"
          initial={
            editing === 'new'
              ? null
              : {
                  title: editing.title,
                  notes: editing.notes,
                  category: editing.category as PackingCategory,
                  quantity: editing.quantity ?? 1,
                }
          }
          onSave={(edit) =>
            editing === 'new'
              ? repositories.checklist.addItem(tripId, edit, 'packing').then(() => undefined)
              : repositories.checklist.editItem(editing.id, edit)
          }
          onClose={() => setEditing(null)}
        />
      ) : null}

      <View style={{ gap: space.sm }}>
        <AppText variant="label">
          {view.total === 0
            ? 'Nothing to pack yet'
            : allPacked
              ? `All ${view.total} packed. Have a great trip!`
              : `${view.packed} of ${view.total} packed`}
        </AppText>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: view.total, now: view.packed }}
          style={{ height: space.sm, borderRadius: radii.pill, backgroundColor: colors.border }}
        >
          <View
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              borderRadius: radii.pill,
              backgroundColor: allPacked ? colors.success : colors.accent,
            }}
          />
        </View>
        <AppText variant="caption">
          Made from your nights, activities, flights and the weather. Change anything you like.
        </AppText>
      </View>

      <WeatherCard weather={data.weather} stops={data.stops} />

      {problem ? (
        <AppText variant="caption" color={colors.accent}>
          {problem}
        </AppText>
      ) : null}

      {view.sections.map((section) => (
        <Card key={section.category}>
          <AppText variant="heading">{section.title}</AppText>
          {section.items.map(row)}
        </Card>
      ))}

      <Button title="Add something to pack" kind="secondary" onPress={() => setEditing('new')} />

      {view.noLongerNeeded.length ? (
        <Card>
          <AppText variant="heading">No longer needed</AppText>
          <AppText variant="caption">
            Your trip or the weather changed, so these may not be needed any more. Remove them, or
            keep any you still want by ticking or editing them.
          </AppText>
          {view.noLongerNeeded.map(row)}
          <Button
            title="Remove them"
            kind="ghost"
            onPress={() =>
              void run(repositories.checklist.deleteItems(view.noLongerNeeded.map((i) => i.id)))
            }
          />
        </Card>
      ) : null}
    </>
  );
}
