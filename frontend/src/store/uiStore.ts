import { create } from 'zustand';

import type { TripTab } from '@/lib/tripTabs';

/**
 * Screen state only (decisions/tech-stack.md, AF5). Trip data never goes here:
 * it lives in the local database and is read through repositories.
 */

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface UiState {
  /** Shown by the SyncIndicator. Set from PowerSync's status; in mock and api mode it stays "synced". */
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
  /** Why the server last refused a change made on this phone (the change was undone). */
  syncProblem: string | null;
  setSyncProblem: (problem: string | null) => void;
  /** The tab last open on each trip page, so Back and forth keeps your place (memory only). */
  tripTabs: Record<string, TripTab>;
  setTripTab: (tripId: string, tab: TripTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
  syncStatus: 'synced',
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  syncProblem: null,
  setSyncProblem: (syncProblem) => set({ syncProblem }),
  tripTabs: {},
  setTripTab: (tripId, tab) =>
    set((s) => (s.tripTabs[tripId] === tab ? s : { tripTabs: { ...s.tripTabs, [tripId]: tab } })),
}));
