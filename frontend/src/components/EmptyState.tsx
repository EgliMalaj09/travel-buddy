import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Button } from './Button';

export function EmptyState({
  icon,
  title,
  message,
  actionTitle,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  const { colors, space } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }}>
      <Ionicons name={icon} size={40} color={colors.inkSoft} />
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} /> : null}
    </View>
  );
}
