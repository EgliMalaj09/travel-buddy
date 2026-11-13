import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { dataMode, repositories } from '@/data';
import { photoFilesSupported, removeOrphanPhotoFiles } from '@/services/photoFiles';
import { runPhotoUploads } from '@/services/photoUpload';

let currentUser: string | null = null;

/** Uploads the waiting photos of the logged-in user (does nothing in mock mode or the web preview). */
export function startPhotoUploads(): void {
  const userId = currentUser;
  if (!userId || dataMode !== 'local' || !photoFilesSupported) return;
  void runPhotoUploads(() => repositories.media.listWaitingUploads(userId));
}

/**
 * Keeps photo files moving while the app is open (KAN-39): uploads waiting photos when someone
 * logs in, when the network changes (Wi-Fi comes back) and when the app comes back to the front.
 * Once per login it also removes files of photos that are gone from this phone (deleted
 * elsewhere, trip deleted, or another user's) so nothing personal stays behind.
 */
export function usePhotoSync(userId: string | null): void {
  useEffect(() => {
    currentUser = userId;
    if (!userId || dataMode !== 'local' || !photoFilesSupported) return;

    void repositories.media
      .listAllIds()
      .then(removeOrphanPhotoFiles)
      .catch(() => undefined)
      .finally(startPhotoUploads);

    const network = Network.addNetworkStateListener(() => startPhotoUploads());
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') startPhotoUploads();
    });
    return () => {
      network.remove();
      app.remove();
      if (currentUser === userId) currentUser = null;
    };
  }, [userId]);
}
