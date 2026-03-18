import type { EnergySectorResponse } from "../types/market";
import { fetchSectorSnapshot } from "./sectorApi";

export async function fetchEnergySectorData(): Promise<EnergySectorResponse> {
  const normalized = await fetchSectorSnapshot("/energy-sector", {
    defaultIndexName: "NIFTY ENERGY",
    sourceLabel: "energy sector"
  });

  if (import.meta.env.DEV) {
    console.info("[energy-sector] response", {
      xCache: normalized.apiCacheStatus ?? null,
      dataStatus: normalized.dataStatus ?? "live",
      lastRefreshError: normalized.lastRefreshError ?? null
    });
  }

  return normalized;
}
