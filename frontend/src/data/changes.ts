import { useSyncExternalStore } from 'react';

/**
 * A tiny "data changed" signal. Repositories call `notifyDataChanged()` after a write;
 * screens add `useDataVersion()` to their `useAsync` deps so they load again.
 * With PowerSync, live queries replace this.
 */
let version = 0;
const listeners = new Set<() => void>();

export function notifyDataChanged(): void {
  version += 1;
  for (const l of listeners) l();
}

/** Calls `listener` after every data change (for stores outside React). Returns the unsubscribe. */
export function subscribeDataChanged(listener: () => void): () => void {
  return subscribe(listener);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDataVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
}

/**
 * Changes only when the logged-in user changes (or the session is back after opening).
 * Every `useAsync` loads again then, also screens that do not follow `useDataVersion`.
 */
let ownerEpoch = 0;
const ownerListeners = new Set<() => void>();

export function notifyOwnerChanged(): void {
  ownerEpoch += 1;
  for (const l of ownerListeners) l();
  notifyDataChanged();
}

export function useOwnerEpoch(): number {
  return useSyncExternalStore(
    (listener) => {
      ownerListeners.add(listener);
      return () => ownerListeners.delete(listener);
    },
    () => ownerEpoch,
    () => ownerEpoch,
  );
}
