import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption' | 'date' | 'note';

/** All text in the app goes through this, so fonts and sizes come from the theme. */
export function AppText({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  const { colors, fonts, fontSizes } = useTheme();
  const v = {
    title: { fontFamily: fonts.title, fontSize: fontSizes.xxl, color: colors.ink },
    heading: { fontFamily: fonts.title, fontSize: fontSizes.lg, color: colors.ink },
    body: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.ink },
    label: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.ink },
    caption: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.inkSoft },
    date: { fontFamily: fonts.mono, fontSize: fontSizes.sm, color: colors.inkSoft },
    note: { fontFamily: fonts.hand, fontSize: fontSizes.md, color: colors.ink },
  }[variant];
  return <Text style={[v, color ? { color } : null, style]} {...rest} />;
}
