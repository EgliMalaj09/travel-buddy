import { removeExportFiles } from '@/services/accountExport';
import { forgetAllUploads } from '@/services/photoUpload';
import { deletePhotoFiles, photoFolderIds } from '@/services/photoFiles';
import { clearFxCache } from '@/services/fxRates';
import { clearReminders } from '@/services/reminders';
import { clearWeatherCache } from '@/services/weather';

import { notifyOwnerChanged } from './changes';
import {
  clearLocalDatabase,
  createLocalChecklist,
  createLocalExpenses,
  createLocalMedia,
  createLocalPlaces,
  createLocalSettings,
  createLocalTrips,
  setLocalOwner,
} from './local/localStore';
import type { SettingsRepository } from './repositories/settingsRepository';
import { createApiExpenseRepository } from './repositories/apiExpenseRepository';
import { createApiMediaRepository } from './repositories/apiMediaRepository';
import { createMockMediaRepository, type MediaRepository } from './repositories/mediaRepository';
import { createApiPlaceRepository } from './repositories/apiPlaceRepository';
import {
  createMemoryChecklistRepository,
  type ChecklistRepository,
} from './repositories/checklistRepository';
import { createApiTripRepository } from './repositories/apiTripRepository';
import {
  createMockExpenseRepository,
  type ExpenseRepository,
} from './repositories/expenseRepository';
import { createMockPlaceRepository, type PlaceRepository } from './repositories/placeRepository';
import { createMockTripRepository, type TripRepository } from './repositories/tripRepository';
export type { PlaceInput, PlaceRepository } from './repositories/placeRepository';
export { PLACE_NOTE_MAX, PLACE_TITLE_MAX, placeInputProblem } from './repositories/placeRepository';
export type { ExpenseInput, ExpenseRepository } from './repositories/expenseRepository';
export {
  EXPENSE_NOTE_MAX,
  EXPENSE_TITLE_MAX,
  expenseInputProblem,
} from './repositories/expenseRepository';

export type { MediaRepository, PhotoInput } from './repositories/mediaRepository';
export { DUPLICATE_PHOTO } from './repositories/mediaRepository';

export type { ChecklistEdit, ChecklistRepository } from './repositories/checklistRepository';
export { checklistEditProblem, QUANTITY_MAX } from './repositories/checklistRepository';
export type {
  FinishInput,
  FlightInput,
  StopInput,
  TripInput,
  TripOwner,
  TripRepository,
} from './repositories/tripRepository';
export { FINISH_NOTE_MAX, finishTripProblem } from './repositories/tripRepository';

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

interface Repositories {
  trips: TripRepository;
  places: PlaceRepository;
  expenses: ExpenseRepository;
  media: MediaRepository;
}

function createRepositories(mode: DataMode): { mode: DataMode; repos: Repositories } {
  if (mode === 'mock') {
    return {
      mode,
      repos: {
        trips: createMockTripRepository(),
        places: createMockPlaceRepository(),
        expenses: createMockExpenseRepository(),
        media: createMockMediaRepository(),
      },
    };
  }
  if (mode === 'local') {
    const trips = createLocalTrips();
    const places = createLocalPlaces();
    const expenses = createLocalExpenses();
    const media = createLocalMedia();
    if (trips && places && expenses && media)
      return { mode, repos: { trips, places, expenses, media } };
  }
  return {
    mode: 'api',
    repos: {
      trips: createApiTripRepository(),
      places: createApiPlaceRepository(),
      expenses: createApiExpenseRepository(),
      media: createApiMediaRepository(),
    },
  };
}

const chosen = createRepositories(pickDataMode());

/** The data source in use ("local" falls back to "api" where there is no local database: web). */
export const dataMode: DataMode = chosen.mode;

/**
 * Checklist items: in the local database in "local" mode. Mock mode and the web preview keep
 * them in memory (gone after a reload): the server has no checklist read endpoint, the phone
 * gets them through PowerSync.
 */
const checklist: ChecklistRepository =
  (dataMode === 'local' ? createLocalChecklist() : null) ?? createMemoryChecklistRepository();

export const repositories: Repositories & { checklist: ChecklistRepository } = {
  ...chosen.repos,
  checklist,
};

/**
 * The account's settings row on the phone, synced by PowerSync ("local" mode only). Null in the web
 * preview and mock mode: there settings stay on this phone only (services/userSettings).
 */
export const settingsRepository: SettingsRepository | null =
  dataMode === 'local' ? createLocalSettings() : null;

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
  repositories.places.reset?.();
  repositories.expenses.reset?.();
  repositories.media.reset?.();
  repositories.checklist.reset?.();
  clearWeatherCache();
  clearFxCache();
  notifyOwnerChanged();
}

/**
 * Removes the account's data from this phone (account deleted, KAN-22): the local database with
 * changes still waiting, photo files and their upload state, "Download my data" files, planned
 * reminders and the cached weather and rates (they hold trip places). The caller also forgets the session and settings.
 */
export async function forgetAccountOnPhone(): Promise<void> {
  setDataOwner(null);
  if (dataMode === 'local') await clearLocalDatabase();
  for (const id of photoFolderIds()) deletePhotoFiles(id);
  forgetAllUploads();
  removeExportFiles();
  await clearReminders().catch(() => undefined);
  clearWeatherCache();
  clearFxCache();
}

export * from './types';
export * from './useAsync';
export { subscribeDataChanged, useDataVersion } from './changes';
