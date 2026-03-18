import type { EnergySectorResponse } from "../types/market";
import { fetchSectorSnapshot } from "./sectorApi";

export async function fetchOilGasSectorData(): Promise<EnergySectorResponse> {
  const normalized = await fetchSectorSnapshot("/oil-gas", {
    defaultIndexName: "NIFTY OIL & GAS",
    sourceLabel: "oil & gas sector"
  });

  if (import.meta.env.DEV) {
    console.info("[oil-gas-sector] response", {
      xCache: normalized.apiCacheStatus ?? null,
      dataStatus: normalized.dataStatus ?? "live",
      lastRefreshError: normalized.lastRefreshError ?? null
    });
  }

  return normalized;
}
