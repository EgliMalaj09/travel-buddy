import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Stamp } from '@/components/core';
import { useTheme } from '@/theme/ThemeProvider';

export interface PassportGridStamp {
  code: string;
  name: string;
  date: string;
}

/** Each stamp sits at its own small angle, like real ones (design guide). */
const angles = [-8, 6, -4, 9, -11, 5];

/**
 * The passport page: stamps three to a row on a surface card (design guide "Departures").
 * Finish trip's stamp screen (KAN-47) and the Globe tab use it; the Atlas (KAN-49/51) will too.
 * `renderLast` lets a screen draw the newest stamp itself (to animate it in).
 */
export function PassportGrid({
  stamps,
  size = 92,
  renderStamp,
}: {
  stamps: PassportGridStamp[];
  size?: number;
  /** Draws a stamp differently (the newly added ones animate in). Return null for the normal one. */
  renderStamp?: (stamp: PassportGridStamp, index: number) => ReactNode | null;
}) {
  const { colors, radii, space } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        rowGap: space.lg,
        columnGap: space.sm,
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        paddingVertical: space.lg,
        paddingHorizontal: space.sm,
      }}
    >
      {stamps.map((s, i) => (
        <View key={s.code} style={{ width: '30%', alignItems: 'center' }}>
          {renderStamp?.(s, i) ?? (
            <Stamp
              code={s.code}
              name={s.name}
              date={s.date}
              size={size}
              rotate={angles[i % angles.length]}
              opacity={0.85}
            />
          )}
        </View>
      ))}
    </View>
  );
}
