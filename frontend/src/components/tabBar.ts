import type { Theme } from '@/theme/tokens';

/**
 * Tab bar look (component kit "TabBar"). Used by src/app/(tabs)/_layout.tsx.
 * Kept here so the designer restyles it in one place.
 */
export function tabBarOptions(theme: Theme) {
  const { colors, fonts } = theme;
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.inkSoft,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarLabelStyle: { fontFamily: fonts.bodyMedium },
  };
}
