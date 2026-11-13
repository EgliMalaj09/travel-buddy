import { useCallback, useEffect, useState } from 'react';

import { errorText } from '@/api/client';

/** Loads something for a page: data, a friendly error, a loading flag and reload(). */
export function useLoad<T>(load: () => Promise<{ data?: T; error?: unknown }>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    run()
      .then((r) => {
        if (!alive) return;
        if (r.error !== undefined || r.data === undefined) {
          setError(errorText(r.error));
        } else {
          setError(null);
          setData(r.data);
        }
      })
      .catch(() => alive && setError('Cannot reach the server. Check your connection, or that the API is running.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [run, tick]);

  return { data, error, loading, reload: () => setTick((n) => n + 1) };
}
