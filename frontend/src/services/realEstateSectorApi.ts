import type { RealEstateSectorResponse } from "../types/market";
import { fetchSectorSnapshot } from "./sectorApi";

export async function fetchRealEstateSectorData(): Promise<RealEstateSectorResponse> {
  const normalized = await fetchSectorSnapshot("/real-estate-sector", {
    defaultIndexName: "NIFTY REALTY",
    sourceLabel: "real estate sector"
  });

  if (import.meta.env.DEV) {
    console.info("[real-estate-sector] response", {
      xCache: normalized.apiCacheStatus ?? null,
      dataStatus: normalized.dataStatus ?? "live",
      lastRefreshError: normalized.lastRefreshError ?? null
    });
  }

  return normalized;
}
