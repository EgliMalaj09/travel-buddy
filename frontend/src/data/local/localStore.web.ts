import type { ChecklistRepository } from '../repositories/checklistRepository';
import type { ExpenseRepository } from '../repositories/expenseRepository';
import type { MediaRepository } from '../repositories/mediaRepository';
import type { TripRepository } from '../repositories/tripRepository';
import type { PlaceRepository } from '../repositories/placeRepository';
import type { SettingsRepository } from '../repositories/settingsRepository';

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

export function createLocalChecklist(): ChecklistRepository | null {
  return null;
}

export function createLocalExpenses(): ExpenseRepository | null {
  return null;
}

export function createLocalMedia(): MediaRepository | null {
  return null;
}

export function createLocalSettings(): SettingsRepository | null {
  return null;
}

export async function clearLocalDatabase(): Promise<void> {}
