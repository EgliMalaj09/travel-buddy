import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { AppText, Card } from '@/components';
import { summarize, summaryLine } from '@/lib/weather';
import { useTheme } from '@/theme/ThemeProvider';

import { usePacking } from './usePacking';

/**
 * On the trip page's Plan tab: "Packing · 4 of 20 packed" and the weather of the first stop.
 * Tapping it opens the Packing tab.
 */
export function PackingCard({ tripId, onPress }: { tripId: string; onPress: () => void }) {
  const { colors, space } = useTheme();
  const { data } = usePacking(tripId);
  if (!data) return null;
  const { view, weather } = data;
  const allPacked = view.total > 0 && view.packed === view.total;
  const first = weather?.stops.find((s) => s.days.length);
  const summary = first ? summarize(first.days) : null;
  const city = first ? data.stops.find((s) => s.id === first.stopId)?.cityName : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Packing, ${view.packed} of ${view.total} packed`}
      onPress={onPress}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ flex: 1, gap: space.xxs }}>
            <AppText variant="label">
              Packing · {view.packed} of {view.total} packed
            </AppText>
            {allPacked ? (
              <AppText variant="caption" color={colors.success}>
                All packed!
              </AppText>
            ) : summary && city ? (
              <AppText variant="caption" numberOfLines={1}>
                {city}: {summaryLine(summary)}
              </AppText>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.inkSoft} />
        </View>
      </Card>
    </Pressable>
  );
}
