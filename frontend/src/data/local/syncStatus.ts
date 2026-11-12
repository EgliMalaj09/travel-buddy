import type { SyncStatus } from '@/store/uiStore';

/** The parts of PowerSync's SyncStatus the indicator needs. */
export interface PowerSyncState {
  connected: boolean;
  connecting: boolean;
  uploading: boolean;
  downloading: boolean;
  uploadError?: Error;
}

/**
 * What the sync indicator shows (Offline sync, S5):
 * - "syncing" while sending or getting changes, or while connecting,
 * - "error" when sending changes failed while connected (PowerSync tries again by itself),
 * - "offline" when the phone can't reach the sync service: everything is saved on the phone,
 * - "synced" otherwise.
 */
export function syncStatusFrom(s: PowerSyncState): SyncStatus {
  if (s.uploading || s.downloading) return 'syncing';
  if (s.connected) return s.uploadError ? 'error' : 'synced';
  return s.connecting ? 'syncing' : 'offline';
}
