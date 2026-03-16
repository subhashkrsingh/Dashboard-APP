import axios from "axios";

import type { EnergySectorResponse } from "../types/market";
import { API_BASE_URL, normalizeSectorResponse } from "./sectorApi";

export async function fetchOilGasSectorData(): Promise<EnergySectorResponse> {
  const response = await axios.get(`${API_BASE_URL}/oil-gas`, {
    timeout: 20000
  });

  const normalized = normalizeSectorResponse(response.data, {
    defaultIndexName: "NIFTY OIL & GAS",
    sourceLabel: "oil & gas sector",
    apiCacheStatus: String(response.headers?.["x-cache"] ?? "").trim() || undefined
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
