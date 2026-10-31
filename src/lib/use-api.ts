"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal data hook: load on mount / when deps change, expose reload + optimistic set. */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await ref.current());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}
