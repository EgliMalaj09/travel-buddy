import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';

import {
  ActionSheet,
  AppText,
  Button,
  Chip,
  EmptyState,
  Input,
  OptionPicker,
  Screen,
} from '@/components';
import {
  EXPENSE_NOTE_MAX,
  EXPENSE_TITLE_MAX,
  expenseInputProblem,
  repositories,
  useAsync,
  type ExpenseInput,
} from '@/data';
import { currencies } from '@/data/static/countries';
import type { Expense, ExpenseCategory, IsoDate, Trip, TripStop } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { todayIso } from '@/lib/dates';
import {
  currencyChoices,
  defaultCurrency,
  expenseCategoryLabels,
  expenseCategoryOrder,
  expenseDayLabel,
  expenseDays,
  spentAtFor,
} from '@/lib/expenses';
import { amountText, minorUnits, parseAmount } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

import { useHomeCurrency } from './useExpenses';

/**
 * Add or edit an expense (KAN-42). Opened from the Expenses tab, an expense row and quick add.
 * Params: tripId, and expenseId to edit.
 */
export function ExpenseFormScreen() {
  const { tripId, expenseId } = useLocalSearchParams<{ tripId: string; expenseId?: string }>();
  const { data, loading } = useAsync(async () => {
    const trip = await repositories.trips.getTrip(tripId);
    if (!trip) return null;
    const [stops, expenses] = await Promise.all([
      repositories.trips.listStops(tripId),
      repositories.expenses.listExpenses(tripId),
    ]);
    const expense = expenseId ? (expenses.find((e) => e.id === expenseId) ?? null) : null;
    return { trip, stops, expenses, expense };
  }, [tripId, expenseId]);

  if (loading) return null;
  if (!data || (expenseId && !data.expense)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon="alert-circle-outline" title="Expense not found" />
      </Screen>
    );
  }
  return (
    <ExpenseForm
      trip={data.trip}
      stops={data.stops}
      expense={data.expense}
      usedCurrencies={data.expenses.map((e) => e.currency)}
    />
  );
}

function ExpenseForm({
  trip,
  stops,
  expense,
  usedCurrencies,
}: {
  trip: Trip;
  stops: TripStop[];
  expense: Expense | null;
  usedCurrencies: string[];
}) {
  const { colors, space } = useTheme();
  const { user } = useAuth();
  const home = useHomeCurrency();
  const today = todayIso();
  const days = expenseDays(trip, today, expense?.fxRateDate ?? null);
  const [day, setDay] = useState<IsoDate>(expense?.fxRateDate ?? today);
  const [currency, setCurrency] = useState(
    expense?.currency ?? defaultCurrency(trip, stops, today, home),
  );
  // The currency follows the day (the stop you are in) until the user picks one.
  const [currencyPicked, setCurrencyPicked] = useState(!!expense);
  const [amount, setAmount] = useState(
    expense ? amountText(expense.amountMinor, expense.currency) : '',
  );
  const [title, setTitle] = useState(expense?.title ?? '');
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'food');
  const [note, setNote] = useState(expense?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const dayScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);

  const quick = currencyChoices(stops, home, usedCurrencies);
  const choices = quick.includes(currency) ? quick : [currency, ...quick];
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c.code, label: c.name, hint: c.code })),
    [],
  );

  const pickDay = (d: IsoDate) => {
    setDay(d);
    if (!currencyPicked) setCurrency(defaultCurrency(trip, stops, d, home));
  };
  const pickCurrency = (c: string) => {
    setCurrency(c);
    setCurrencyPicked(true);
  };

  const save = async () => {
    const amountMinor = parseAmount(amount, currency);
    if (amountMinor === null) {
      const decimals = minorUnits(currency);
      return setError(
        decimals === 0
          ? `Enter an amount more than 0, with no decimals for ${currency}.`
          : `Enter an amount more than 0, with up to ${decimals} decimals.`,
      );
    }
    const input: ExpenseInput = {
      // No name typed: the category is the name ("Food").
      title: title.trim() || expenseCategoryLabels[category],
      category,
      amountMinor,
      currency,
      spentAt: spentAtFor(day, today, new Date(), expense),
      fxRateDate: day,
      note: note || null,
    };
    const problem = expenseInputProblem(input);
    if (problem) return setError(problem);
    setSaving(true);
    setError(null);
    try {
      if (expense) await repositories.expenses.updateExpense(expense.id, input);
      else await repositories.expenses.createExpense(trip.id, input, user?.id ?? '');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the expense.');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!expense) return;
    await repositories.expenses.deleteExpense(expense.id);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: expense ? 'Edit expense' : 'Add an expense' }} />
      <ActionSheet
        visible={askDelete}
        title={`Delete ${expense?.title ?? 'this expense'}?`}
        actions={[{ label: 'Delete', destructive: true, onPress: () => void remove() }]}
        onClose={() => setAskDelete(false)}
      />
      <Screen>
        <Input
          label={`Amount in ${currency}`}
          placeholder={minorUnits(currency) === 0 ? '1500' : '12.50'}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          autoFocus={!expense}
          returnKeyType="done"
        />

        <View style={{ gap: space.xs }}>
          <AppText variant="label">Currency</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
            {choices.map((c) => (
              <Chip
                key={c}
                label={c === home ? `${c} (home)` : c}
                selected={currency === c}
                onPress={() => pickCurrency(c)}
              />
            ))}
          </View>
        </View>
        <OptionPicker
          label="Another currency"
          value={currency}
          options={currencyOptions}
          onChange={pickCurrency}
        />

        <View style={{ gap: space.xs }}>
          <AppText variant="label">What was it?</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
            {expenseCategoryOrder.map((c) => (
              <Chip
                key={c}
                label={expenseCategoryLabels[c]}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
        </View>

        <Input
          label="Name (optional)"
          placeholder={`${expenseCategoryLabels[category]}: dinner, taxi, museum…`}
          value={title}
          onChangeText={setTitle}
          maxLength={EXPENSE_TITLE_MAX}
          returnKeyType="done"
        />

        <View style={{ gap: space.xs }}>
          <AppText variant="label">Which day?</AppText>
          <ScrollView ref={dayScroll} horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: space.xs }}>
              {days.map((d) => (
                <View
                  key={d}
                  onLayout={(e) => {
                    if (d !== day || scrolled.current) return;
                    scrolled.current = true;
                    dayScroll.current?.scrollTo({ x: e.nativeEvent.layout.x, animated: false });
                  }}
                >
                  <Chip
                    label={expenseDayLabel(trip, d, today)}
                    selected={day === d}
                    onPress={() => pickDay(d)}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
          <AppText variant="caption">
            {currency === home
              ? 'In your home currency.'
              : `Shown in ${home} with the rate of that day.`}
          </AppText>
        </View>

        <Input
          label="Note (optional)"
          placeholder="Paid by card, tip included…"
          value={note}
          onChangeText={setNote}
          maxLength={EXPENSE_NOTE_MAX}
          multiline
        />

        {error ? (
          <AppText variant="caption" color={colors.accent}>
            {error}
          </AppText>
        ) : null}

        <Button
          title={saving ? 'Saving…' : expense ? 'Save' : 'Add expense'}
          disabled={saving}
          onPress={() => void save()}
        />
        {expense ? (
          <Button title="Delete expense" kind="ghost" onPress={() => setAskDelete(true)} />
        ) : null}
      </Screen>
    </>
  );
}
