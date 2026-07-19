"use client";

import { useCallback, useEffect, useState, type DependencyList } from "react";
import { VAN_IDS, type VanId } from "@/lib/scheduling/vans";

export function useVanPrefetchCache<T>(
  fetchVan: (van: VanId) => Promise<T | null>,
  deps: DependencyList,
  refreshKey = 0,
  /** Fetch this van first so the UI can render before the other van loads. */
  primaryVan?: VanId
) {
  const [cache, setCache] = useState<Partial<Record<VanId, T>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const order = primaryVan
      ? [primaryVan, ...VAN_IDS.filter((van) => van !== primaryVan)]
      : [...VAN_IDS];

    const next: Partial<Record<VanId, T>> = {};
    let failures = 0;

    const firstVan = order[0];
    const firstData = await fetchVan(firstVan);
    if (firstData !== null) next[firstVan] = firstData;
    else failures += 1;
    setCache({ ...next });
    setLoading(false);

    const rest = order.slice(1);
    if (rest.length === 0) {
      if (failures === VAN_IDS.length) setError("Could not load data.");
      return;
    }

    const entries = await Promise.all(
      rest.map(async (van) => {
        const data = await fetchVan(van);
        return [van, data] as const;
      })
    );

    for (const [van, data] of entries) {
      if (data !== null) next[van] = data;
      else failures += 1;
    }

    setCache({ ...next });
    if (failures === VAN_IDS.length) {
      setError("Could not load data.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  return { cache, loading, error, refresh };
}
