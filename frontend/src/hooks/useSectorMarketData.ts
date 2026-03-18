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

function toClientRefreshError(error: unknown): SectorSnapshot["lastRefreshError"] | undefined {
  if (error instanceof Error && error.message) {
    return {
      code: "API_UNAVAILABLE",
      message: error.message,
      recordedAt: new Date().toISOString()
    };
  }

  return undefined;
}

export function useSectorMarketData({
  queryKey,
  queryFn,
  storageKey,
  refetchInterval = 10000,
  staleTime = 9000
}: UseSectorMarketDataOptions): SectorMarketDataResult {
  const queryLabel = Array.isArray(queryKey) ? queryKey.join(":") : String(queryKey);
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
          warning: "Using saved market snapshot while the API is temporarily unavailable.",
          lastRefreshError: persistedSnapshot.lastRefreshError ?? toClientRefreshError(query.error)
        }
      : query.data;

  useEffect(() => {
    if (!import.meta.env.DEV || !data || !query.isFetching) {
      return;
    }

    console.info(`[sector-data] ${queryLabel}`, {
      xCache: data.apiCacheStatus ?? null,
      dataStatus: data.dataStatus ?? "live",
      lastRefreshError: data.lastRefreshError ?? null
    });
  }, [data, queryLabel, query.isFetching]);

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
