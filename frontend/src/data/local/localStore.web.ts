import type { TripRepository } from '../repositories/tripRepository';

/**
 * The web preview has no local database (PowerSync's phone library is native only).
 * There the app keeps using the server directly ("api" mode).
 */
export function setLocalOwner(_userId: string | null): void {}

export function createLocalTrips(): TripRepository | null {
  return null;
}
