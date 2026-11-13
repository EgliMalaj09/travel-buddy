import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { api } from '@/api/client';
import { exportFileName, isExportFileName } from '@/lib/account';

/**
 * "Download my data" (KAN-22, GDPR right of access). Asks the server for everything it keeps about
 * the user (GET /me/export), writes it to a .json file and opens the phone's share sheet, so the
 * user can save it to Files / Drive or email it to themselves (expo-sharing, agreed 13 Nov 2026).
 * The file is made in the app's cache. It holds personal data, so it is removed at the next export,
 * on logout-by-deletion, or by the phone when it clears the cache. (Not right after sharing: on
 * Android the share sheet returns before the other app has read the file.)
 * Nothing about the content is logged.
 */
export type ExportOutcome = 'shared' | 'downloaded' | 'offline' | 'tooMany' | 'failed';

export async function exportMyData(): Promise<ExportOutcome> {
  let text: string;
  try {
    const { data, response } = await api.GET('/me/export', { parseAs: 'text' });
    if (response.status === 429) return 'tooMany';
    if (!response.ok || typeof data !== 'string') return 'failed';
    text = data;
  } catch {
    return 'offline';
  }
  const name = exportFileName();

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }

  if (!(await Sharing.isAvailableAsync())) return 'failed';
  removeExportFiles();
  const file = new File(Paths.cache, name);
  try {
    file.create();
    file.write(text);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Save your data',
    });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Removes earlier export files from the app's cache. */
export function removeExportFiles(): void {
  if (Platform.OS === 'web') return;
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && isExportFileName(entry.name)) entry.delete();
    }
  } catch {
    // Nothing to remove.
  }
}
