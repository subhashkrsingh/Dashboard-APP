import axios from "axios";

import type { PowerSectorResponse } from "../types/market";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

function normalizeCompany(row: Record<string, unknown>) {
  return {
    symbol: String(row.symbol ?? ""),
    name: String(row.name ?? row.company ?? row.symbol ?? ""),
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : null,
    change: Number.isFinite(Number(row.change)) ? Number(row.change) : null,
    percentChange: Number.isFinite(Number(row.percentChange)) ? Number(row.percentChange) : null,
    volume: Number.isFinite(Number(row.volume)) ? Number(row.volume) : null
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumberOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeResponse(payload: unknown): PowerSectorResponse {
  if (!isObject(payload)) {
    throw new Error("Unexpected response from power sector API");
  }

  // New schema
  if (isObject(payload.sectorIndex) && Array.isArray(payload.companies)) {
    return {
      ...payload,
      sectorIndex: {
        name: String(payload.sectorIndex.name ?? "NIFTY POWER"),
        lastPrice: toNumberOrNull(payload.sectorIndex.lastPrice),
        change: toNumberOrNull(payload.sectorIndex.change),
        percentChange: toNumberOrNull(payload.sectorIndex.percentChange)
      },
      companies: payload.companies.map(item => normalizeCompany((item as Record<string, unknown>) ?? {})),
      gainers: Array.isArray(payload.gainers)
        ? payload.gainers.map(item => normalizeCompany((item as Record<string, unknown>) ?? {}))
        : [],
      losers: Array.isArray(payload.losers)
        ? payload.losers.map(item => normalizeCompany((item as Record<string, unknown>) ?? {}))
        : [],
      fetchedAt: String(payload.fetchedAt ?? new Date().toISOString())
    } as PowerSectorResponse;
  }

  // Legacy schema fallback
  if (Array.isArray(payload.companies) && (payload.indexName || payload.lastPrice !== undefined)) {
    const sectorLast = toNumberOrNull(payload.lastPrice);
    const sectorPct = toNumberOrNull(payload.percentChange);
    const sectorChange = toNumberOrNull(payload.change) ??
      (sectorLast !== null && sectorPct !== null ? (sectorLast * sectorPct) / 100 : null);

    return {
      sectorIndex: {
        name: String(payload.indexName ?? "NIFTY POWER"),
        lastPrice: sectorLast,
        change: sectorChange,
        percentChange: sectorPct
      },
      companies: payload.companies.map(item => normalizeCompany((item as Record<string, unknown>) ?? {})),
      gainers: (Array.isArray(payload.gainers)
        ? payload.gainers
        : (Array.isArray(payload.topGainers) ? payload.topGainers : [])
      ).map((item: unknown) => normalizeCompany((item as Record<string, unknown>) ?? {})),
      losers: (Array.isArray(payload.losers)
        ? payload.losers
        : (Array.isArray(payload.topLosers) ? payload.topLosers : [])
      ).map((item: unknown) => normalizeCompany((item as Record<string, unknown>) ?? {})),
      marketStatus: isObject(payload.marketStatus)
        ? {
            isOpen: Boolean(payload.marketStatus.isOpen),
            label: String(payload.marketStatus.label ?? "CLOSED"),
            timezone: String(payload.marketStatus.timezone ?? "Asia/Kolkata"),
            checkedAt: String(payload.marketStatus.checkedAt ?? new Date().toISOString())
          }
        : undefined,
      advanceDecline: isObject(payload.advanceDecline)
        ? {
            advances: Number(payload.advanceDecline.advances ?? 0),
            declines: Number(payload.advanceDecline.declines ?? 0),
            unchanged: Number(payload.advanceDecline.unchanged ?? 0)
          }
        : undefined,
      sourceTimestamp: payload.sourceTimestamp ? String(payload.sourceTimestamp) : undefined,
      fetchedAt: String(payload.fetchedAt ?? new Date().toISOString()),
      fallbackIndexUsed: Boolean(payload.fallbackIndexUsed),
      requestedIndex: payload.requestedIndex ? String(payload.requestedIndex) : undefined,
      stale: Boolean(payload.stale),
      warning: payload.warning ? String(payload.warning) : undefined,
      cached: Boolean(payload.cached)
    };
  }

  throw new Error("Unexpected response from power sector API");
}

export async function fetchPowerSectorData(): Promise<PowerSectorResponse> {
  const response = await axios.get(`${API_BASE_URL}/power-sector`, {
    timeout: 20000
  });

  return normalizeResponse(response.data);
}
