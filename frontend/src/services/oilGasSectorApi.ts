import type { EnergySectorResponse } from "../types/market";
import { fetchSectorSnapshotById } from "./sectorApi";

export async function fetchOilGasSectorData(): Promise<EnergySectorResponse> {
  const normalized = await fetchSectorSnapshotById("oil-gas");

  if (import.meta.env.DEV) {
    console.info("[oil-gas-sector] response", {
      xCache: normalized.apiCacheStatus ?? null,
      dataStatus: normalized.dataStatus ?? "live",
      lastRefreshError: normalized.lastRefreshError ?? null
    });
  }

  return normalized;
}
