import { useEffect, useState } from "react";
import { useQuery, type QueryKey, type UseQueryResult } from "@tanstack/react-query";

import type { PriceDirection, SectorSnapshot, TimePoint } from "../types/market";
import { useMarketHistory, type CompanyHistoryPoint } from "./useMarketHistory";

interface UseSectorMarketDataOptions {
  queryKey: QueryKey;
  queryFn: () => Promise<SectorSnapshot>;
  storageKey?: string;
  refetchInterval?: number;
  staleTime?: number;
}

export interface SectorMarketDataResult
  extends Pick<UseQueryResult<SectorSnapshot, unknown>, "data" | "error" | "isLoading" | "isFetching" | "refetch"> {
  sectorHistory: TimePoint[];
  companyHistory: Record<string, CompanyHistoryPoint[]>;
  signals: Record<string, PriceDirection>;
}

function readPersistedSnapshot(storageKey: string): SectorSnapshot | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as SectorSnapshot) : undefined;
  } catch {
    return undefined;
  }
}

export function useSectorMarketData({
  queryKey,
  queryFn,
  storageKey,
  refetchInterval = 10000,
  staleTime = 9000
}: UseSectorMarketDataOptions): SectorMarketDataResult {
  const resolvedStorageKey = storageKey ?? `sector-snapshot:${queryKey.join(":")}`;
  const [persistedSnapshot, setPersistedSnapshot] = useState<SectorSnapshot | undefined>(() =>
    readPersistedSnapshot(resolvedStorageKey)
  );

  const query = useQuery({
    queryKey,
    queryFn,
    refetchInterval,
    refetchIntervalInBackground: true,
    staleTime,
    initialData: persistedSnapshot
  });

  useEffect(() => {
    if (!query.data || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(resolvedStorageKey, JSON.stringify(query.data));
    setPersistedSnapshot(query.data);
  }, [query.data, resolvedStorageKey]);

  const offlineDataStatus: SectorSnapshot["dataStatus"] =
    persistedSnapshot?.snapshot ? "snapshot" : "stale";

  const data =
    query.isError && persistedSnapshot
      ? {
          ...persistedSnapshot,
          cached: true,
          stale: true,
          snapshot: persistedSnapshot.snapshot ?? false,
          dataStatus: offlineDataStatus,
          warning: "Using saved market snapshot while the API is temporarily unavailable."
        }
      : query.data;

  const { sectorHistory, companyHistory, signals } = useMarketHistory(data);

  return {
    ...query,
    data,
    error: data ? null : query.error,
    sectorHistory,
    companyHistory,
    signals
  };
}
