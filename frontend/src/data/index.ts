import { notifyOwnerChanged } from './changes';
import { createLocalChecklist, createLocalTrips, setLocalOwner } from './local/localStore';
import {
  createMemoryChecklistRepository,
  type ChecklistRepository,
} from './repositories/checklistRepository';
import { createApiTripRepository } from './repositories/apiTripRepository';
import { createMockTripRepository, type TripRepository } from './repositories/tripRepository';

export type { ChecklistEdit, ChecklistRepository } from './repositories/checklistRepository';
export { checklistEditProblem } from './repositories/checklistRepository';
export type {
  FlightInput,
  StopInput,
  TripInput,
  TripOwner,
  TripRepository,
} from './repositories/tripRepository';

/**
 * Picks the data source.
 * - "local" (default on phones): trips are saved in the phone's own database first and work with
 *   no signal; PowerSync syncs them with the server (offline sync, KAN-15).
 * - "api" (default in the web preview): trips are read and saved on the server directly (KAN-16).
 *   Needs the connection. Set EXPO_PUBLIC_DATA_MODE=api to use it on a phone too.
 * - "mock": sample trips in memory, gone after a reload. Set EXPO_PUBLIC_DATA_MODE=mock, or use
 *   mock login (EXPO_PUBLIC_AUTH_MODE=mock): a mock user has no account on the server.
 */
export type DataMode = 'mock' | 'api' | 'local';

export function pickDataMode(
  dataEnv = process.env.EXPO_PUBLIC_DATA_MODE,
  authEnv = process.env.EXPO_PUBLIC_AUTH_MODE,
): DataMode {
  if (dataEnv === 'mock' || dataEnv === 'api' || dataEnv === 'local') return dataEnv;
  return authEnv === 'mock' ? 'mock' : 'local';
}

function createTrips(mode: DataMode): { mode: DataMode; trips: TripRepository } {
  if (mode === 'mock') return { mode, trips: createMockTripRepository() };
  if (mode === 'local') {
    const trips = createLocalTrips();
    if (trips) return { mode, trips };
  }
  return { mode: 'api', trips: createApiTripRepository() };
}

const chosen = createTrips(pickDataMode());

/** The data source in use ("local" falls back to "api" where there is no local database: web). */
export const dataMode: DataMode = chosen.mode;

/**
 * Checklist items: in the local database in "local" mode. Mock mode and the web preview keep
 * them in memory (gone after a reload): the server has no checklist read endpoint, the phone
 * gets them through PowerSync.
 */
const checklist: ChecklistRepository =
  (dataMode === 'local' ? createLocalChecklist() : null) ?? createMemoryChecklistRepository();

export const repositories: { trips: TripRepository; checklist: ChecklistRepository } = {
  trips: chosen.trips,
  checklist,
};

let owner: string | null = null;

/**
 * Called by the app shell with the logged-in user (null while loading or logged out).
 * A new user, or the session coming back after the app opened, clears what was loaded
 * and makes every screen load again: nobody sees the trips of the user before.
 */
export function setDataOwner(userId: string | null): void {
  if (userId === owner) return;
  owner = userId;
  if (dataMode === 'local') setLocalOwner(userId);
  repositories.trips.reset?.();
  repositories.checklist.reset?.();
  notifyOwnerChanged();
}

export * from './types';
export * from './useAsync';
export { useDataVersion } from './changes';
