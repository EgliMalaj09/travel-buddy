import { column, PowerSyncDatabase, Schema, Table } from '@powersync/react-native';

import { currentAccessToken, defaultPowerSyncUrl } from '@/api/client';
import { getDeviceValue, setDeviceValue } from '@/services/deviceStorage';
import { useUiStore } from '@/store/uiStore';

import { notifyDataChanged } from '../changes';
import { createHttpTripApi } from '../repositories/apiTripRepository';
import {
  createLocalChecklistRepository,
  type ChecklistRepository,
} from '../repositories/checklistRepository';
import { createLocalTripRepository, type LocalDb } from '../repositories/localTripRepository';
import type { TripRepository } from '../repositories/tripRepository';
import { syncStatusFrom } from './syncStatus';
import { syncedTableNames, syncedTables } from './tables';
import { uploadBatch } from './uploadChanges';

/** The phone's local database (KAN-15). Opened the first time it is needed. */
let db: PowerSyncDatabase | null = null;

function schema(): Schema {
  const tables = Object.fromEntries(
    Object.entries(syncedTables).map(([name, columns]) => [
      name,
      new Table(Object.fromEntries(Object.entries(columns).map(([c, type]) => [c, column[type]]))),
    ]),
  );
  return new Schema(tables);
}

function open(): PowerSyncDatabase {
  if (db) return db;
  const opened = new PowerSyncDatabase({
    schema: schema(),
    database: { dbFilename: 'travelapp.db' },
  });

  // Every change, on this phone or downloaded from the server, makes the screens load again.
  opened.onChange(
    { onChange: () => notifyDataChanged() },
    { tables: syncedTableNames, throttleMs: 150 },
  );
  opened.registerListener({
    statusChanged: (status) => useUiStore.getState().setSyncStatus(syncStatusFrom(status)),
  });
  db = opened;
  return opened;
}

const tripApi = createHttpTripApi();

const connector = {
  async fetchCredentials() {
    const token = await currentAccessToken();
    return token ? { endpoint: defaultPowerSyncUrl(), token } : null;
  },
  async uploadData(database: PowerSyncDatabase) {
    await uploadBatch(await database.getCrudBatch(100), tripApi.upload, (message) =>
      useUiStore.getState().setSyncProblem(message),
    );
  },
};

const OWNER_KEY = 'localDb.owner';

/** Owner changes run one after the other; reads and writes wait for the current one. */
let switching: Promise<void> = Promise.resolve();

/**
 * Called with the logged-in user (null when logged out).
 * - Same user as last time: connect and sync, everything on the phone stays.
 * - Another user: the phone forgets the trips of the user before, then downloads the new user's.
 * - Logged out: stop syncing, but keep the data (waiting changes are sent after the next login).
 */
export function setLocalOwner(userId: string | null): void {
  const database = open();
  switching = switching
    .catch(() => undefined)
    .then(async () => {
      if (!userId) {
        await database.disconnect();
        useUiStore.getState().setSyncStatus('offline');
        return;
      }
      const before = getDeviceValue(OWNER_KEY);
      if (before && before !== userId) await database.disconnectAndClear();
      setDeviceValue(OWNER_KEY, userId);
      useUiStore.getState().setSyncProblem(null);
      // connect() returns quickly and keeps trying in the background when offline.
      await database.connect(connector);
    });
}

/** The database the repository uses: every call waits until an owner change is finished. */
function readyDb(): LocalDb {
  return {
    async getAll(sql, parameters) {
      await switching.catch(() => undefined);
      return open().getAll(sql, parameters);
    },
    async writeTransaction(run) {
      await switching.catch(() => undefined);
      return open().writeTransaction((tx) => run(tx));
    },
  };
}

/** Trips in the phone's local database, synced by PowerSync. Null where it can't run (web). */
export function createLocalTrips(): TripRepository | null {
  return createLocalTripRepository(readyDb());
}

/** Checklist items in the same local database, synced the same way. */
export function createLocalChecklist(): ChecklistRepository | null {
  return createLocalChecklistRepository(readyDb());
}
