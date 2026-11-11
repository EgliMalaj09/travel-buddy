import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const { colors, radii, space } = useTheme();
  const style = {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  };
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.85 : 1 }]}
    >
      {children}
    </Pressable>
  );
}
