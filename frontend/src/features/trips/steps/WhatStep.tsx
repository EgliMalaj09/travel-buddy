import { View } from 'react-native';

import { Chip } from '@/components';
import type { TripActivity } from '@/data/types';
import { activityLabels, type TripDraft } from '@/lib/tripDraft';
import { useTheme } from '@/theme/ThemeProvider';

/** Step 3: activities, choose any (used for the packing list and checklist). */
export function WhatStep({
  draft,
  onChange,
}: {
  draft: TripDraft;
  onChange: (d: TripDraft) => void;
}) {
  const { space } = useTheme();
  const toggle = (a: TripActivity) =>
    onChange({
      ...draft,
      activities: draft.activities.includes(a)
        ? draft.activities.filter((x) => x !== a)
        : [...draft.activities, a],
    });
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {(Object.keys(activityLabels) as TripActivity[]).map((a) => (
        <Chip
          key={a}
          label={activityLabels[a]}
          selected={draft.activities.includes(a)}
          onPress={() => toggle(a)}
        />
      ))}
    </View>
  );
}
