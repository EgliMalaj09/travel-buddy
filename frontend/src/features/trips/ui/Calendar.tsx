import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components';
import type { IsoDate } from '@/data/types';
import { addMonths, formatMonth, monthGrid, monthOf, todayIso } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Month calendar (our own, no library). "range" mode: first tap = first day, second tap =
 * last day; a tap before the first day starts again. "single" mode: one day.
 */
export function Calendar({
  mode,
  start,
  end,
  onChange,
}: {
  mode: 'range' | 'single';
  start: IsoDate | null;
  end: IsoDate | null;
  onChange: (start: IsoDate | null, end: IsoDate | null) => void;
}) {
  const { colors, radii, space } = useTheme();
  const today = todayIso();
  const [shown, setShown] = useState(() => monthOf(start ?? today));

  const pick = (day: IsoDate) => {
    if (mode === 'single') return onChange(day, day);
    if (!start || end || day < start) return onChange(day, null);
    onChange(start, day);
  };

  const arrow = (dir: -1 | 1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? 'Previous month' : 'Next month'}
      onPress={() => setShown((m) => addMonths(m, dir))}
      hitSlop={10}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons
        name={dir < 0 ? 'chevron-back' : 'chevron-forward'}
        size={22}
        color={colors.accent}
      />
    </Pressable>
  );

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: space.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {arrow(-1)}
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {formatMonth(shown.year, shown.month)}
        </AppText>
        {arrow(1)}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((d, i) => (
          <AppText key={i} variant="caption" style={{ flex: 1, textAlign: 'center' }}>
            {d}
          </AppText>
        ))}
      </View>
      {monthGrid(shown.year, shown.month).map((week, w) => (
        <View key={w} style={{ flexDirection: 'row' }}>
          {week.map((day, i) => {
            if (!day) return <View key={i} style={{ flex: 1, height: 44 }} />;
            const isEdge = day === start || day === end;
            const inRange = !!start && !!end && day > start && day < end;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={day}
                accessibilityState={{ selected: isEdge || inRange }}
                onPress={() => pick(day)}
                style={{
                  flex: 1,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: inRange ? colors.background : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: radii.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isEdge ? colors.accent : 'transparent',
                    borderWidth: day === today && !isEdge ? 1 : 0,
                    borderColor: colors.accent,
                  }}
                >
                  <AppText variant="date" color={isEdge ? colors.onAccent : colors.ink}>
                    {Number(day.slice(8))}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
