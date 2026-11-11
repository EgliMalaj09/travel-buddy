import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

/** Page wrapper: background colour, safe area and padding from the theme. */
export function Screen({
  children,
  scroll = true,
  header,
}: {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
}) {
  const { colors, space } = useTheme();
  const content = scroll ? (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>{children}</ScrollView>
  ) : (
    <View style={{ flex: 1, padding: space.lg, gap: space.lg }}>{children}</View>
  );
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={['top']}>
      {header}
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
