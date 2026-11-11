import Ionicons from '@expo/vector-icons/Ionicons';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Grey box with an image icon. Marks where a real photo or illustration will go
 * (intro screens, empty states). Replace with real images later.
 */
export function PhotoPlaceholder({
  width,
  height,
  round = false,
  style,
}: {
  width: number;
  height: number;
  round?: boolean;
  style?: ViewStyle;
}) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessibilityLabel="Photo placeholder"
      style={[
        {
          width,
          height,
          borderRadius: round ? width / 2 : radii.md,
          backgroundColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: round ? 3 : 0,
          borderColor: colors.surface,
        },
        style,
      ]}
    >
      <Ionicons name="image-outline" size={Math.min(width, height) * 0.35} color={colors.inkSoft} />
    </View>
  );
}
