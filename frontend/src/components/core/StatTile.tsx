import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

/**
 * One big number with a label under it (design guide "Departures", StatTiles): the trip recap
 * (KAN-47), later lifetime stats (KAN-50). `onAccent` is for tiles on the accent colour.
 */
export function StatTile({
  value,
  label,
  onAccent = false,
}: {
  value: string;
  label: string;
  onAccent?: boolean;
}) {
  const { colors, fonts, fontSizes, radii, space } = useTheme();
  const fg = onAccent ? colors.onAccent : colors.ink;
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={{
        flex: 1,
        minWidth: 120,
        backgroundColor: onAccent ? colors.onAccentSoft : colors.surface,
        borderRadius: radii.lg,
        padding: space.lg,
        gap: space.xs,
      }}
    >
      <AppText
        variant="title"
        color={fg}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontFamily: fonts.title, fontSize: fontSizes.xxl, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </AppText>
      <AppText variant="label" color={fg}>
        {label}
      </AppText>
    </View>
  );
}
