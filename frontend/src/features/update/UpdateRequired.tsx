import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Shown over everything when the back office raised the minimum app version (KAN-55).
 * Words follow the design guide: what happened, what is safe, what to do.
 */
export function UpdateRequired({ onRetry }: { onRetry: () => void }) {
  const { colors, space } = useTheme();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.background, justifyContent: 'center', padding: space.lg },
      ]}
      accessibilityViewIsModal
    >
      <EmptyState
        icon="cloud-download-outline"
        title="Update the app"
        message="This version is too old to keep your trips in sync. Everything on your phone is safe. Install the new version from TestFlight or Google Play, then open the app again."
        actionTitle="Check again"
        onAction={onRetry}
      />
    </View>
  );
}
