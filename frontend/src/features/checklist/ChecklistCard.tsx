import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Card } from '@/components';
import { dueLabel } from '@/lib/checklist';
import { todayIso } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';

import { useChecklist } from './useChecklist';

/** On the trip page: "Checklist · 3 of 12 done" and the next thing to do. Opens the checklist. */
export function ChecklistCard({ tripId }: { tripId: string }) {
  const { colors, space } = useTheme();
  const { data } = useChecklist(tripId);
  if (!data) return null;
  const { view } = data;
  const allDone = view.total > 0 && view.done === view.total;
  const due = view.next ? dueLabel(view.next.dueDate, todayIso()) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Checklist, ${view.done} of ${view.total} done`}
      onPress={() => router.push(`/trip/checklist/${tripId}`)}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ flex: 1, gap: space.xxs }}>
            <AppText variant="label">
              Checklist · {view.done} of {view.total} done
            </AppText>
            {allDone ? (
              <AppText variant="caption" color={colors.success}>
                All done. Ready to go!
              </AppText>
            ) : view.next ? (
              <AppText variant="caption">
                Next: {view.next.title}
                {due ? ` · ${due}` : ''}
              </AppText>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.inkSoft} />
        </View>
      </Card>
    </Pressable>
  );
}
