import axios from "axios";

import type { RealEstateSectorResponse } from "../types/market";
import { API_BASE_URL, normalizeSectorResponse } from "./sectorApi";

function toApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseError = error.response?.data;
    if (responseError && typeof responseError === "object" && "error" in responseError) {
      const message = String(responseError.error ?? "").trim();
      if (message) {
        return message;
      }
    }

    if (error.code === "ECONNABORTED") {
      return "Real estate sector API request timed out.";
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load real estate sector data.";
}

export async function fetchRealEstateSectorData(): Promise<RealEstateSectorResponse> {
  try {
    const response = await axios.get(`${API_BASE_URL}/real-estate-sector`, {
      timeout: 20000
    });

    const normalized = normalizeSectorResponse(response.data, {
      defaultIndexName: "NIFTY REALTY",
      sourceLabel: "real estate sector",
      apiCacheStatus: String(response.headers?.["x-cache"] ?? "").trim() || undefined
    });

    if (import.meta.env.DEV) {
      console.info("[real-estate-sector] response", {
        xCache: normalized.apiCacheStatus ?? null,
        dataStatus: normalized.dataStatus ?? "live",
        lastRefreshError: normalized.lastRefreshError ?? null
      });
    }

    return normalized;
  } catch (error) {
    throw new Error(toApiErrorMessage(error));
  }
}
