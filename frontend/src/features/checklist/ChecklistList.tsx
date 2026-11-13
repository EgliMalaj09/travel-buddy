import { useState } from 'react';
import { View } from 'react-native';

import { ActionSheet, AppText, Button, Card, EmptyState } from '@/components';
import { repositories, type ChecklistItem, type TaskCategory } from '@/data';
import { legalTexts } from '@/data/static/legalTexts';
import { todayIso } from '@/lib/dates';
import { openLegal } from '@/features/legal/openLegal';
import { parseLegal, plainText, section } from '@/lib/legalText';
import { useTheme } from '@/theme/ThemeProvider';

import { ChecklistItemRow } from './ChecklistItemRow';
import { ChecklistItemSheet } from './ChecklistItemSheet';
import { useChecklist } from './useChecklist';

/** The short entry-rules note from legal/entry-rules-disclaimer.md (KAN-62). */
const ENTRY_RULES_NOTE = plainText(parseLegal(section(legalTexts.entryRules, 'Short note')));

/**
 * The trip's checklist (KAN-24), shown in the trip page's Checklist tab (KAN-53): made from the
 * rules on the phone, grouped, with due dates and official links. Tick, add your own, edit,
 * delete. Works offline; syncs like the trips. The trip page wraps it in its Screen.
 */
export function ChecklistList({ tripId }: { tripId: string }) {
  const { colors, radii, space } = useTheme();
  const today = todayIso();
  const { data, loading, error } = useChecklist(tripId);
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
        title={error ? 'The checklist could not load' : 'Trip not found'}
        message={error?.message}
      />
    );
  }
  const { view } = data;
  const progress = view.total ? view.done / view.total : 0;

  return (
    <>
      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.title ?? ''}
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
          initial={
            editing === 'new'
              ? null
              : {
                  title: editing.title,
                  notes: editing.notes,
                  category: editing.category as TaskCategory,
                }
          }
          onSave={(edit) =>
            editing === 'new'
              ? repositories.checklist.addItem(tripId, edit).then(() => undefined)
              : repositories.checklist.editItem(editing.id, edit)
          }
          onClose={() => setEditing(null)}
        />
      ) : null}
      <View style={{ gap: space.sm }}>
        <AppText variant="label">
          {view.total === 0
            ? 'Nothing to do yet'
            : view.done === view.total
              ? `All ${view.total} done. Ready to go!`
              : `${view.done} of ${view.total} done`}
        </AppText>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: view.total, now: view.done }}
          style={{ height: space.sm, borderRadius: radii.pill, backgroundColor: colors.border }}
        >
          <View
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              borderRadius: radii.pill,
              backgroundColor:
                view.done === view.total && view.total ? colors.success : colors.accent,
            }}
          />
        </View>
        <AppText variant="caption">Made from your passport, stops, dates and activities.</AppText>
        <AppText variant="caption">{ENTRY_RULES_NOTE}</AppText>
        <Button
          kind="ghost"
          title="About visa and entry rules"
          onPress={() => openLegal('entry-rules')}
        />
      </View>

      {problem ? (
        <AppText variant="caption" color={colors.accent}>
          {problem}
        </AppText>
      ) : null}

      {view.sections.map((section) => (
        <Card key={section.category}>
          <AppText variant="heading">{section.title}</AppText>
          {section.items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              today={today}
              onToggle={(done) => void run(repositories.checklist.setDone(item.id, done))}
              onMenu={() => setMenuFor(item)}
            />
          ))}
        </Card>
      ))}

      <Button title="Add your own item" kind="secondary" onPress={() => setEditing('new')} />

      {view.noLongerNeeded.length ? (
        <Card>
          <AppText variant="heading">No longer needed</AppText>
          <AppText variant="caption">
            Your trip changed, so these do not apply any more. Remove them, or keep any you still
            want by ticking or editing them.
          </AppText>
          {view.noLongerNeeded.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              today={today}
              onToggle={(done) => void run(repositories.checklist.setDone(item.id, done))}
              onMenu={() => setMenuFor(item)}
            />
          ))}
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
