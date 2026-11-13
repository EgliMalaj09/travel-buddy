import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { AppText, Card } from '@/components';
import { summarizeExpenses } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

import { useExpenses } from './useExpenses';

/** On the Plan tab: "Expenses · €245.10 spent". Tapping it opens the Expenses tab. */
export function ExpensesCard({ tripId, onPress }: { tripId: string; onPress: () => void }) {
  const { colors, space } = useTheme();
  const { data } = useExpenses(tripId);
  if (!data) return null;
  const summary = summarizeExpenses(data.expenses, data.homeCurrency, data.rates);
  const total = formatMoney(summary.totalHome, data.homeCurrency);
  const line = !summary.count
    ? 'Track what you spend, in any currency.'
    : `${summary.count === 1 ? '1 expense' : `${summary.count} expenses`}${
        summary.pending ? ` · ${summary.pending} converting…` : ''
      }`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={summary.count ? `Expenses, ${total} spent` : 'Expenses'}
      onPress={onPress}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ flex: 1, gap: space.xxs }}>
            <AppText variant="label">
              {summary.count ? `Expenses · ${total} spent` : 'Expenses'}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {line}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.inkSoft} />
        </View>
      </Card>
    </Pressable>
  );
}
