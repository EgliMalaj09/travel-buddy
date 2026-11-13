/**
 * THE theme file. Every colour, font, size, space and radius in the app comes from here.
 * A designer can restyle the whole app by changing this file only.
 * Starting values: "Passport journal" direction (see frontend/README.md).
 */

export const colors = {
  /** Page background (linen paper) */
  background: '#ECE7DD',
  /** Cards and sheets */
  surface: '#F7F3EC',
  /** Main text */
  ink: '#2A211C',
  /** Secondary text */
  inkSoft: '#6E6259',
  /** The one accent: passport oxblood. Also visited pins. */
  accent: '#7A2631',
  /** Text on top of the accent colour */
  onAccent: '#F7F3EC',
  /** Planned places */
  planned: '#4D6B7F',
  /** Bucket-list places */
  bucket: '#8C6D2A',
  /** Thin lines and borders */
  border: '#D8D0C3',
  /** Sync / status colours */
  success: '#3F6B4A',
  warning: '#A8642A',
  /** Suns of the trip rating and other "highlight" moments (design guide "sun") */
  sun: '#FFC02E',
  /** Tiles on top of the accent colour (recap): onAccent at 14% */
  onAccentSoft: 'rgba(247, 243, 236, 0.14)',
  /** Dimmed page behind menus and sheets (ink at 40%) */
  overlay: 'rgba(42, 33, 28, 0.4)',
} as const;

export const fonts = {
  /** Titles: Brygada 1918 */
  title: 'Brygada1918_600SemiBold',
  /** Interface text: Hanken Grotesk */
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodyBold: 'HankenGrotesk_700Bold',
  /** Dates and numbers: Courier Prime */
  mono: 'CourierPrime_400Regular',
  /** The user's own notes only: Kalam */
  hand: 'Kalam_400Regular',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const theme = { colors, fonts, fontSizes, space, radii } as const;
export type Theme = typeof theme;
