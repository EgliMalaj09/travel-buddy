import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Card, EmptyState } from '@/components';
import type { IsoDate } from '@/data/types';
import { expenseCategoryLabels, groupExpensesByDay, summarizeExpenses } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

import { ExpenseRow } from './ExpenseRow';
import { useExpenses } from './useExpenses';

export function addExpense(tripId: string) {
  router.push({ pathname: '/expense/edit', params: { tripId } });
}

/**
 * The trip page's Expenses tab (KAN-42): the total in your home currency, what it went on, what
 * you paid in each currency, then every expense day by day, newest first.
 */
export function TripExpenses({ tripId, today }: { tripId: string; today: IsoDate }) {
  const { colors, radii, space } = useTheme();
  const { data } = useExpenses(tripId);
  if (!data) return null;
  const { trip, expenses, rates, homeCurrency } = data;

  if (!expenses.length) {
    return (
      <EmptyState
        icon="wallet-outline"
        title="No expenses yet"
        message="Add what you spend, in the local money or any currency. You always see the total in your home currency."
        actionTitle="Add an expense"
        onAction={() => addExpense(tripId)}
      />
    );
  }

  const summary = summarizeExpenses(expenses, homeCurrency, rates);
  const biggest = summary.byCategory[0]?.homeMinor ?? 0;
  const days = groupExpensesByDay(trip, expenses, homeCurrency, rates, today);

  return (
    <>
      <Card>
        <AppText variant="label">Spent on this trip</AppText>
        <AppText variant="title">{formatMoney(summary.totalHome, homeCurrency)}</AppText>
        <AppText variant="caption">
          {summary.count === 1 ? '1 expense' : `${summary.count} expenses`}
          {summary.pending ? ` · ${summary.pending} converting… (needs a connection once)` : ''}
        </AppText>

        {summary.byCategory.map(({ category, homeMinor }) => (
          <View key={category} style={{ gap: space.xxs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="caption">{expenseCategoryLabels[category]}</AppText>
              <AppText variant="caption">{formatMoney(homeMinor, homeCurrency)}</AppText>
            </View>
            <View
              style={{ height: space.xs, borderRadius: radii.pill, backgroundColor: colors.border }}
            >
              <View
                style={{
                  height: space.xs,
                  borderRadius: radii.pill,
                  backgroundColor: colors.accent,
                  width: `${biggest ? Math.max(4, Math.round((homeMinor / biggest) * 100)) : 0}%`,
                }}
              />
            </View>
          </View>
        ))}

        {summary.byCurrency.length > 1 || summary.byCurrency[0]?.currency !== homeCurrency ? (
          <AppText variant="caption">
            Paid in: {summary.byCurrency.map((c) => formatMoney(c.minor, c.currency)).join(' · ')}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <AppText variant="label">Expenses</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add an expense"
            onPress={() => addExpense(tripId)}
            hitSlop={12}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs, minHeight: 44 }}
          >
            <Ionicons name="add" size={20} color={colors.accent} />
            <AppText variant="label" color={colors.accent}>
              Add
            </AppText>
          </Pressable>
        </View>

        {days.map((d) => (
          <View key={d.date} style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="date" color={d.date === today ? colors.accent : undefined}>
                {d.label}
              </AppText>
              <AppText variant="date">{formatMoney(d.totalHome, homeCurrency)}</AppText>
            </View>
            {d.expenses.map((e) => (
              <ExpenseRow key={e.id} expense={e} homeCurrency={homeCurrency} rates={rates} />
            ))}
          </View>
        ))}
      </Card>
    </>
  );
}
