import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import type { AppMapProps } from './Map';

/**
 * Web preview of the map: MapLibre's React Native library runs on phones only, so the web build
 * shows a plain box. The lists next to the map still work.
 */
export function AppMap({ height = 320, fill }: AppMapProps) {
  const { colors, radii, space } = useTheme();
  return (
    <View
      style={[
        fill ? { flex: 1 } : { height },
        {
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          padding: space.lg,
        },
      ]}
    >
      <Ionicons name="map-outline" size={32} color={colors.inkSoft} />
      <AppText variant="caption">The map works in the phone app.</AppText>
    </View>
  );
}

export function AppMapMarker(_: { id: string; children: ReactElement }) {
  return null;
}

export const mapSupported = false;
