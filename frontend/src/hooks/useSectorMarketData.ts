import { useEffect, useMemo, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { PriceDirection, SectorSnapshot, TimePoint } from "../types/market";
import { useMarketHistory, type CompanyHistoryPoint } from "./useMarketHistory";
import { fetchSectorSnapshotById } from "../services/sectorApi";
import { getSectorApiConfig } from "../services/sectorApiMap";

const INVALID_SECTOR_QUERY_KEY = ["sector-market", "invalid-sector"] as const;

export interface SectorMarketDataResult
  extends Pick<UseQueryResult<SectorSnapshot, Error>, "data" | "error" | "isLoading" | "isFetching" | "refetch"> {
  sectorHistory: TimePoint[];
  companyHistory: Record<string, CompanyHistoryPoint[]>;
  signals: Record<string, PriceDirection>;
}

function readPersistedSnapshot(storageKey: string | undefined): SectorSnapshot | undefined {
  if (!storageKey || typeof window === "undefined") {
    return undefined;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as SectorSnapshot) : undefined;
  } catch {
    return undefined;
  }
}

function persistSnapshot(storageKey: string | undefined, snapshot: SectorSnapshot | undefined) {
  if (!storageKey || !snapshot || typeof window === "undefined") {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // localStorage can fail in private mode; ignore and keep runtime cache only.
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

export function useSectorMarketData(sector: string | undefined): SectorMarketDataResult {
  const sectorConfig = getSectorApiConfig(sector);
  const resolvedStorageKey = sectorConfig?.storageKey;
  const [persistedSnapshot, setPersistedSnapshot] = useState<SectorSnapshot | undefined>(() =>
    readPersistedSnapshot(resolvedStorageKey)
  );

  useEffect(() => {
    setPersistedSnapshot(readPersistedSnapshot(resolvedStorageKey));
  }, [resolvedStorageKey]);

  const query = useQuery({
    queryKey: sectorConfig?.queryKey ?? INVALID_SECTOR_QUERY_KEY,
    queryFn: async () => {
      if (!sectorConfig) {
        throw new Error(`Invalid sector "${String(sector)}".`);
      }

      return fetchSectorSnapshotById(sectorConfig.id);
    },
    enabled: Boolean(sectorConfig),
    // 60s polling keeps dashboard responsive while avoiding noisy re-fetch loops.
    refetchInterval: 60_000,
    // Background tabs should not keep hitting APIs every minute.
    refetchIntervalInBackground: false,
    // Keep this query fresh long enough to maximize cache hits during navigation.
    staleTime: 45_000,
    gcTime: 30 * 60_000,
    // This dashboard controls refetch manually/interval-wise, so no mount bursts.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    initialData: persistedSnapshot
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    persistSnapshot(resolvedStorageKey, query.data);
    setPersistedSnapshot(query.data);
  }, [query.data, resolvedStorageKey]);

  const data = useMemo(() => {
    if (query.data) {
      return query.data;
    }

    if (!query.isError || !persistedSnapshot) {
      return undefined;
    }

    const offlineDataStatus: SectorSnapshot["dataStatus"] = "cache";
    return {
      ...persistedSnapshot,
      source: "cache" as const,
      isStale: true,
      cached: true,
      stale: true,
      snapshot: persistedSnapshot.snapshot ?? false,
      dataStatus: offlineDataStatus,
      message: "Showing recent snapshot",
      warning: "Showing recent snapshot",
      lastRefreshError: persistedSnapshot.lastRefreshError ?? toClientRefreshError(query.error)
    };
  }, [persistedSnapshot, query.data, query.error, query.isError]);

  useEffect(() => {
    if (!import.meta.env.DEV || !data || !query.isFetching) {
      return;
    }

    console.info(`[sector-data] ${sectorConfig?.id ?? String(sector)}`, {
      xCache: data.apiCacheStatus ?? null,
      dataStatus: data.dataStatus ?? "live",
      lastRefreshError: data.lastRefreshError ?? null
    });
  }, [data, query.isFetching, sector, sectorConfig?.id]);

  const error = useMemo(() => {
    if (data) {
      return null;
    }

    if (!sectorConfig) {
      return new Error(`Invalid sector "${String(sector)}".`);
    }

    return query.error;
  }, [data, query.error, sector, sectorConfig]);

  const { sectorHistory, companyHistory, signals } = useMarketHistory(data);

  return {
    ...query,
    data,
    error,
    isLoading: sectorConfig ? query.isLoading : false,
    isFetching: sectorConfig ? query.isFetching : false,
    sectorHistory,
    companyHistory,
    signals
  };
}
