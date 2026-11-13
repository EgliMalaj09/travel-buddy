import { Pressable, ScrollView, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

export interface TabRowItem<K extends string> {
  key: K;
  label: string;
}

/**
 * A row of tabs inside a page (the trip page's Plan, Places, Checklist, …). The selected tab is
 * underlined in the accent colour. Scrolls sideways when the labels do not fit a small phone.
 */
export function TabRow<K extends string>({
  tabs,
  selected,
  onSelect,
}: {
  tabs: readonly TabRowItem<K>[];
  selected: K;
  onSelect: (key: K) => void;
}) {
  const { colors, space } = useTheme();
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        contentContainerStyle={{ gap: space.lg }}
      >
        {tabs.map((t) => {
          const on = t.key === selected;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onSelect(t.key)}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderBottomColor: on ? colors.accent : 'transparent',
                marginBottom: -1,
              }}
            >
              <AppText variant="label" color={on ? colors.accent : colors.inkSoft}>
                {t.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
