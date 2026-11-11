import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

/** Placeholder logo: working name + small stamp icon. Replaced when the final name and logo exist. */
export function Logo() {
  const { colors, space } = useTheme();
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="Travel App"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.xs,
      }}
    >
      <Ionicons name="paper-plane-outline" size={22} color={colors.accent} />
      <AppText variant="heading">
        Travel App
        <AppText variant="heading" color={colors.accent}>
          .
        </AppText>
      </AppText>
    </View>
  );
}
