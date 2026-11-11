import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

export function Checkbox({
  checked,
  onChange,
  label,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  error?: string;
}) {
  const { colors, radii, space } = useTheme();
  return (
    <View style={{ gap: space.xxs }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radii.sm,
            borderWidth: 1.5,
            borderColor: error ? colors.accent : checked ? colors.accent : colors.inkSoft,
            backgroundColor: checked ? colors.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? <Ionicons name="checkmark" size={16} color={colors.onAccent} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          {typeof label === 'string' ? <AppText variant="body">{label}</AppText> : label}
        </View>
      </Pressable>
      {error ? (
        <AppText variant="caption" color={colors.accent}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
