import type { CompanyQuote, SectorSnapshot } from "../types/market";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export interface NormalizeOptions {
  defaultIndexName: string;
  sourceLabel: string;
}

function normalizeCompany(row: Record<string, unknown>): CompanyQuote {
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

function normalizeCompanies(items: unknown): CompanyQuote[] {
  if (!Array.isArray(items)) return [];
  return items.map(item => normalizeCompany((item as Record<string, unknown>) ?? {}));
}

export function normalizeSectorResponse(payload: unknown, options: NormalizeOptions): SectorSnapshot {
  if (!isObject(payload)) {
    throw new Error(`Unexpected response from ${options.sourceLabel} API`);
  }

  if (isObject(payload.sectorIndex) && Array.isArray(payload.companies)) {
    return {
      ...payload,
      sectorIndex: {
        name: String(payload.sectorIndex.name ?? options.defaultIndexName),
        lastPrice: toNumberOrNull(payload.sectorIndex.lastPrice),
        change: toNumberOrNull(payload.sectorIndex.change),
        percentChange: toNumberOrNull(payload.sectorIndex.percentChange)
      },
      companies: normalizeCompanies(payload.companies),
      gainers: normalizeCompanies(payload.gainers),
      losers: normalizeCompanies(payload.losers),
      fetchedAt: String(payload.fetchedAt ?? new Date().toISOString())
    } as SectorSnapshot;
  }

  if (Array.isArray(payload.companies) && (payload.indexName || payload.lastPrice !== undefined)) {
    const sectorLast = toNumberOrNull(payload.lastPrice);
    const sectorPct = toNumberOrNull(payload.percentChange);
    const sectorChange =
      toNumberOrNull(payload.change) ??
      (sectorLast !== null && sectorPct !== null ? (sectorLast * sectorPct) / 100 : null);

    return {
      sectorIndex: {
        name: String(payload.indexName ?? options.defaultIndexName),
        lastPrice: sectorLast,
        change: sectorChange,
        percentChange: sectorPct
      },
      companies: normalizeCompanies(payload.companies),
      gainers: normalizeCompanies(
        Array.isArray(payload.gainers)
          ? payload.gainers
          : Array.isArray(payload.topGainers)
          ? payload.topGainers
          : []
      ),
      losers: normalizeCompanies(
        Array.isArray(payload.losers)
          ? payload.losers
          : Array.isArray(payload.topLosers)
          ? payload.topLosers
          : []
      ),
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

  throw new Error(`Unexpected response from ${options.sourceLabel} API`);
}
