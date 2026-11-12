import { useEffect, useState } from 'react';

import { useOwnerEpoch } from './changes';

/**
 * Loads data from a repository for a screen. With PowerSync this becomes a live query
 * that updates by itself when the data changes.
 * `deps` must be simple values (strings, numbers): they decide when to load again.
 */
export function useAsync<T>(
  load: () => Promise<T>,
  deps: readonly (string | number | boolean | null | undefined)[],
): {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
} {
  // A new logged-in user always loads again.
  const key = JSON.stringify([useOwnerEpoch(), ...deps]);
  const [state, setState] = useState<{ key?: string; data?: T; error?: Error }>({});

  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setState({ key, data }),
      (error: unknown) =>
        active &&
        setState({ key, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      active = false;
    };
    // `load` is recreated on every render; reloading is driven by `key` only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data: state.data, error: state.error, loading: state.key !== key };
}
