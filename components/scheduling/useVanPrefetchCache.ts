"use client";

import { useCallback, useEffect, useState, type DependencyList } from "react";
import { VAN_IDS, type VanId } from "@/lib/scheduling/vans";

export function useVanPrefetchCache<T>(
  fetchVan: (van: VanId) => Promise<T | null>,
  deps: DependencyList,
  refreshKey = 0
) {
  const [cache, setCache] = useState<Partial<Record<VanId, T>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const entries = await Promise.all(
      VAN_IDS.map(async (van) => {
        const data = await fetchVan(van);
        return [van, data] as const;
      })
    );

    const next: Partial<Record<VanId, T>> = {};
    let failures = 0;
    for (const [van, data] of entries) {
      if (data !== null) next[van] = data;
      else failures += 1;
    }

    setCache(next);
    if (failures === VAN_IDS.length) {
      setError("Could not load data.");
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  return { cache, loading, error, refresh };
}
