import Svg, { Circle, Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { useId } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * A passport stamp (design guide "Departures", component Stamp): a double ring with the country
 * name along the top, the ISO code in the middle and the month below. Drawn in one colour.
 * Used by Finish trip (KAN-47) and later the Atlas / stamp screens (KAN-49/51).
 */
export function Stamp({
  code,
  name,
  date,
  color,
  size = 92,
  rotate = 0,
  opacity = 1,
}: {
  /** ISO country code, e.g. "PT". */
  code: string;
  /** Country name, printed along the ring. */
  name: string;
  /** Short date, e.g. "NOV 2026". */
  date: string;
  color?: string;
  size?: number;
  /** Degrees. Stamps sit a little crooked. */
  rotate?: number;
  opacity?: number;
}) {
  const { colors, fonts } = useTheme();
  const ink = color ?? colors.accent;
  // Long names would run round the whole ring.
  const label = name.length > 22 ? `${name.slice(0, 21)}…` : name;
  // Unique per stamp: two stamps of one country can be on the same screen.
  const pathId = `stamp-arc-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name} stamp, ${date}`}
      style={{ width: size, height: size, opacity, transform: [{ rotate: `${rotate}deg` }] }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <Path id={pathId} d="M50 50m-36 0a36 36 0 1 1 72 0" />
        </Defs>
        <Circle cx={50} cy={50} r={46} fill="none" stroke={ink} strokeWidth={3} />
        <Circle
          cx={50}
          cy={50}
          r={40}
          fill="none"
          stroke={ink}
          strokeWidth={1.2}
          strokeDasharray="2 3"
        />
        <SvgText
          fill={ink}
          fontFamily={fonts.mono}
          fontSize={9.5}
          letterSpacing={2}
          textAnchor="middle"
        >
          <TextPath href={`#${pathId}`} startOffset="50%">
            {label.toUpperCase()}
          </TextPath>
        </SvgText>
        <SvgText
          x={50}
          y={59}
          fill={ink}
          fontFamily={fonts.title}
          fontSize={27}
          fontWeight="800"
          textAnchor="middle"
        >
          {code}
        </SvgText>
        <SvgText
          x={50}
          y={76}
          fill={ink}
          fontFamily={fonts.mono}
          fontSize={7.5}
          letterSpacing={1}
          textAnchor="middle"
        >
          {date}
        </SvgText>
      </Svg>
    </View>
  );
}
