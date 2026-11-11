import { View } from 'react-native';

import { AppText, Card, Input } from '@/components';
import { formatDateRange } from '@/lib/dates';
import { activityLabels, defaultTripName, type TripDraft } from '@/lib/tripDraft';
import { flagEmoji } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

/** Step 4: the name (filled in from the stops, editable) and a short summary. */
export function NameStep({
  draft,
  onChange,
}: {
  draft: TripDraft;
  onChange: (d: TripDraft) => void;
}) {
  const { colors, space } = useTheme();
  const suggested = defaultTripName(draft.stops);
  return (
    <View style={{ gap: space.lg }}>
      <Input
        label="Trip name"
        value={draft.name}
        onChangeText={(name) => onChange({ ...draft, name, nameEdited: name !== suggested })}
        maxLength={120}
        returnKeyType="done"
      />
      <Card>
        <AppText variant="heading">{draft.name || suggested || 'Your trip'}</AppText>
        <AppText variant="date">
          {draft.noDates ? 'Someday' : formatDateRange(draft.startDate, draft.endDate)}
        </AppText>
        <AppText variant="body">
          {draft.stops.map((s) => `${flagEmoji(s.countryCode)} ${s.cityName}`).join('  →  ')}
        </AppText>
        {draft.activities.length ? (
          <AppText variant="caption">
            {draft.activities.map((a) => activityLabels[a]).join(' · ')}
          </AppText>
        ) : null}
        {draft.flights.length ? (
          <AppText variant="caption" color={colors.inkSoft}>
            {draft.flights.length === 1 ? '1 flight' : `${draft.flights.length} flights`}
          </AppText>
        ) : null}
      </Card>
    </View>
  );
}
