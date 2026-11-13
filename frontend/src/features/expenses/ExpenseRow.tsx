import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components';
import type { Expense } from '@/data/types';
import {
  expenseCategoryIcons,
  expenseCategoryLabels,
  homeAmount,
  type RatesByDay,
} from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

/** One expense: icon, name, "Food · note", the amount paid and, below it, the home amount. */
export function ExpenseRow({
  expense,
  homeCurrency,
  rates,
}: {
  expense: Expense;
  homeCurrency: string;
  rates: RatesByDay;
}) {
  const { colors, space } = useTheme();
  const paid = formatMoney(expense.amountMinor, expense.currency);
  const foreign = expense.currency !== homeCurrency;
  const home = foreign ? homeAmount(expense, homeCurrency, rates) : null;
  const open = () =>
    router.push({
      pathname: '/expense/edit',
      params: { tripId: expense.tripId, expenseId: expense.id },
    });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${expense.title}, ${paid}`}
      onPress={open}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}
    >
      <Ionicons name={expenseCategoryIcons[expense.category]} size={18} color={colors.inkSoft} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" numberOfLines={1}>
          {expense.title}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {[expenseCategoryLabels[expense.category], expense.note].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="body">{paid}</AppText>
        {foreign ? (
          <AppText variant="caption">
            {home === null ? 'converting…' : `≈ ${formatMoney(home, homeCurrency)}`}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
