import type { SyncChange, SyncResult } from '../repositories/apiTripRepository';
import { serverColumns, tripTableNames, type TripTableName } from './tables';

/** One waiting change as PowerSync's upload queue gives it (CrudEntry). */
export interface QueuedChange {
  op: 'PUT' | 'PATCH' | 'DELETE' | string;
  table: string;
  id: string;
  opData?: Record<string, unknown>;
}

/** A batch from PowerSync's upload queue (CrudBatch). `complete` removes it from the queue. */
export interface QueuedBatch {
  crud: QueuedChange[];
  complete(): Promise<void>;
}

const isTripTable = (t: string): t is TripTableName => (tripTableNames as string[]).includes(t);

/** The queue entry in the shape POST /sync/upload takes. Server-only columns are not sent. */
export function toSyncChange(c: QueuedChange): SyncChange | null {
  if (!isTripTable(c.table)) return null;
  const op = c.op as SyncChange['op'];
  if (op === 'DELETE') return { op, type: c.table, id: c.id };
  const data = Object.fromEntries(
    Object.entries(c.opData ?? {}).filter(([column]) => !serverColumns.has(column)),
  );
  return { op, type: c.table, id: c.id, data };
}

/** The first reason the server gave for refusing a change, in plain words. */
export function rejectionMessage(results: SyncResult[]): string | null {
  const rejected = results.find((r) => r.status !== 'ok');
  if (!rejected) return null;
  return Object.values(rejected.problems ?? {})[0]?.[0] ?? 'The server could not save a change.';
}

/**
 * Sends one batch of waiting changes to our API (PowerSync calls this again while more wait).
 * - Network or login problem: `upload` throws, the batch stays in the queue and PowerSync tries again.
 * - The server refused a change (it breaks a rule): it is not sent again. The batch is completed,
 *   so the server's version of the row comes back to the phone, and `onRejected` tells the user why.
 */
export async function uploadBatch(
  batch: QueuedBatch | null,
  upload: (changes: SyncChange[]) => Promise<SyncResult[]>,
  onRejected: (message: string) => void,
): Promise<void> {
  if (!batch) return;
  const changes = batch.crud.map(toSyncChange).filter((c): c is SyncChange => c !== null);
  if (changes.length > 0) {
    const message = rejectionMessage(await upload(changes));
    if (message) onRejected(message);
  }
  await batch.complete();
}
