import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useUiStore, type SyncStatus } from '@/store/uiStore';
import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

const labels: Record<SyncStatus, string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  offline: 'Offline, saved on this phone',
  error: "Couldn't sync",
};

const icons: Record<SyncStatus, keyof typeof Ionicons.glyphMap> = {
  synced: 'checkmark-circle-outline',
  syncing: 'sync-outline',
  offline: 'cloud-offline-outline',
  error: 'warning-outline',
};

/** Small sync status shown in the top bar (Offline sync, S5). Details on tap come with KAN-15. */
export function SyncIndicator({ showLabel = false }: { showLabel?: boolean }) {
  const status = useUiStore((s) => s.syncStatus);
  const { colors, space } = useTheme();
  const color =
    status === 'synced' ? colors.success : status === 'error' ? colors.warning : colors.inkSoft;
  return (
    <View
      accessibilityLabel={labels[status]}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}
    >
      <Ionicons name={icons[status]} size={18} color={color} />
      {showLabel ? <AppText variant="caption">{labels[status]}</AppText> : null}
    </View>
  );
}
