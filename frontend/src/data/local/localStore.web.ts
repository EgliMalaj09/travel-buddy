import type { TripRepository } from '../repositories/tripRepository';
import type { PlaceRepository } from '../repositories/placeRepository';

/**
 * The web preview has no local database (PowerSync's phone library is native only).
 * There the app keeps using the server directly ("api" mode).
 */
export function setLocalOwner(_userId: string | null): void {}

export function createLocalTrips(): TripRepository | null {
  return null;
}

export function createLocalPlaces(): PlaceRepository | null {
  return null;
}
