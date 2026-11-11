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
