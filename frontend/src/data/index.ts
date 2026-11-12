import { notifyOwnerChanged } from './changes';
import { createApiTripRepository } from './repositories/apiTripRepository';
import { createMockTripRepository, type TripRepository } from './repositories/tripRepository';

export type {
  FlightInput,
  StopInput,
  TripInput,
  TripOwner,
  TripRepository,
} from './repositories/tripRepository';

/**
 * Picks the data source.
 * - "api" (default): trips are saved on the server (GET /trips, POST /sync/upload, KAN-16).
 * - "mock": sample trips in memory, gone after a reload. Set EXPO_PUBLIC_DATA_MODE=mock, or use
 *   mock login (EXPO_PUBLIC_AUTH_MODE=mock): a mock user has no account on the server.
 * A "local" mode backed by PowerSync (offline, KAN-15) replaces "api" later without changing screens.
 */
export type DataMode = 'mock' | 'api';

export function pickDataMode(
  dataEnv = process.env.EXPO_PUBLIC_DATA_MODE,
  authEnv = process.env.EXPO_PUBLIC_AUTH_MODE,
): DataMode {
  if (dataEnv === 'mock' || dataEnv === 'api') return dataEnv;
  return authEnv === 'mock' ? 'mock' : 'api';
}

export const dataMode: DataMode = pickDataMode();

export const repositories: { trips: TripRepository } = {
  trips: dataMode === 'api' ? createApiTripRepository() : createMockTripRepository(),
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
  repositories.trips.reset?.();
  notifyOwnerChanged();
}

export * from './types';
export * from './useAsync';
export { useDataVersion } from './changes';
