import { create } from 'zustand';

/**
 * Screen state only (decisions/tech-stack.md, AF5). Trip data never goes here:
 * it lives in the local database and is read through repositories.
 */

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface UiState {
  /** Shown by the SyncIndicator. In mock mode it stays "synced". */
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
}

export const useUiStore = create<UiState>((set) => ({
  syncStatus: 'synced',
  setSyncStatus: (syncStatus) => set({ syncStatus }),
}));
