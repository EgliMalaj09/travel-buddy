import { Modal, Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

export interface SheetAction {
  label: string;
  onPress: () => void;
  /** Red text, for delete and similar. */
  destructive?: boolean;
}

/**
 * A small menu that slides up from the bottom: title, optional text, actions, and Cancel.
 * Works the same on Android, iOS and web (Alert.alert with buttons does nothing on web).
 */
export function ActionSheet({
  visible,
  title,
  message,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const { colors, radii, space } = useTheme();
  const row = { paddingVertical: space.md, minHeight: 44, justifyContent: 'center' as const };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close menu"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
      >
        {/* Taps inside the sheet should not close it. */}
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.lg,
            borderTopRightRadius: radii.lg,
            padding: space.lg,
            paddingBottom: space.xxl,
            gap: space.xs,
          }}
        >
          <View style={{ gap: space.xs, paddingBottom: space.sm }}>
            <AppText variant="label">{title}</AppText>
            {message ? (
              <AppText variant="caption" color={colors.inkSoft}>
                {message}
              </AppText>
            ) : null}
          </View>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={({ pressed }) => [row, { opacity: pressed ? 0.6 : 1 }]}
            >
              <AppText variant="body" color={a.destructive ? colors.accent : colors.ink}>
                {a.label}
              </AppText>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              row,
              { borderTopWidth: 1, borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <AppText variant="body" color={colors.inkSoft}>
              Cancel
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
