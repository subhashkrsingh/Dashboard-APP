import type { CompanyQuote, SectorIndex, SectorReturns, SectorSnapshot } from "../types/market";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export interface NormalizeOptions {
  defaultIndexName: string;
  sourceLabel: string;
  apiCacheStatus?: string;
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

function normalizeReturns(value: unknown): SectorReturns | undefined {
  if (!isObject(value)) return undefined;

  const entries = Object.entries(value)
    .map(([key, metric]) => [String(key).toUpperCase(), toNumberOrNull(metric)] as const)
    .filter(([, metric]) => metric !== null);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as SectorReturns;
}

function normalizeSectorIndex(indexPayload: Record<string, unknown>, defaultIndexName: string): SectorIndex {
  const lastPrice = toNumberOrNull(indexPayload.lastPrice);
  const percentChange = toNumberOrNull(indexPayload.percentChange);
  const derivedChange =
    lastPrice !== null && percentChange !== null ? (lastPrice * percentChange) / 100 : null;
  const change = toNumberOrNull(indexPayload.change) ?? derivedChange;
  const previousClose =
    toNumberOrNull(indexPayload.previousClose) ?? (lastPrice !== null && change !== null ? lastPrice - change : null);

  return {
    name: String(indexPayload.name ?? defaultIndexName),
    lastPrice,
    change,
    percentChange,
    indicativeClose: toNumberOrNull(indexPayload.indicativeClose),
    previousClose,
    open: toNumberOrNull(indexPayload.open),
    dayHigh: toNumberOrNull(indexPayload.dayHigh),
    dayLow: toNumberOrNull(indexPayload.dayLow),
    yearHigh: toNumberOrNull(indexPayload.yearHigh),
    yearLow: toNumberOrNull(indexPayload.yearLow),
    tradedVolume: toNumberOrNull(indexPayload.tradedVolume),
    tradedValue: toNumberOrNull(indexPayload.tradedValue),
    ffmCap: toNumberOrNull(indexPayload.ffmCap),
    pe: toNumberOrNull(indexPayload.pe),
    pb: toNumberOrNull(indexPayload.pb),
    returns: normalizeReturns(indexPayload.returns)
  };
}

function normalizeCompanies(items: unknown): CompanyQuote[] {
  if (!Array.isArray(items)) return [];
  return items.map(item => normalizeCompany((item as Record<string, unknown>) ?? {}));
}

function normalizeLastRefreshError(value: unknown): SectorSnapshot["lastRefreshError"] | undefined {
  if (!isObject(value)) return undefined;

  const message = String(value.message ?? "").trim();
  if (!message) {
    return undefined;
  }

  return {
    code: value.code ? String(value.code) : undefined,
    message,
    recordedAt: value.recordedAt ? String(value.recordedAt) : undefined
  };
}

export function normalizeSectorResponse(payload: unknown, options: NormalizeOptions): SectorSnapshot {
  if (!isObject(payload)) {
    throw new Error(`Unexpected response from ${options.sourceLabel} API`);
  }

  if (isObject(payload.sectorIndex) && Array.isArray(payload.companies)) {
    return {
      ...payload,
      sectorIndex: normalizeSectorIndex(payload.sectorIndex, options.defaultIndexName),
      companies: normalizeCompanies(payload.companies),
      gainers: normalizeCompanies(payload.gainers),
      losers: normalizeCompanies(payload.losers),
      fetchedAt: String(payload.fetchedAt ?? new Date().toISOString()),
      apiCacheStatus: options.apiCacheStatus,
      lastRefreshError: normalizeLastRefreshError(payload.lastRefreshError)
    } as SectorSnapshot;
  }

  if (Array.isArray(payload.companies) && (payload.indexName || payload.lastPrice !== undefined)) {
    const sectorLast = toNumberOrNull(payload.lastPrice);
    const sectorPct = toNumberOrNull(payload.percentChange);
    const sectorChange =
      toNumberOrNull(payload.change) ??
      (sectorLast !== null && sectorPct !== null ? (sectorLast * sectorPct) / 100 : null);

    return {
      sectorIndex: normalizeSectorIndex(
        {
          name: payload.indexName ?? options.defaultIndexName,
          lastPrice: sectorLast,
          change: sectorChange,
          percentChange: sectorPct,
          indicativeClose: payload.indicativeClose,
          previousClose: payload.previousClose,
          open: payload.open,
          dayHigh: payload.dayHigh,
          dayLow: payload.dayLow,
          yearHigh: payload.yearHigh,
          yearLow: payload.yearLow,
          tradedVolume: payload.tradedVolume,
          tradedValue: payload.tradedValue,
          ffmCap: payload.ffmCap,
          pe: payload.pe,
          pb: payload.pb,
          returns: payload.returns
        },
        options.defaultIndexName
      ),
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
      cached: Boolean(payload.cached),
      apiCacheStatus: options.apiCacheStatus,
      lastRefreshError: normalizeLastRefreshError(payload.lastRefreshError)
    };
  }

  throw new Error(`Unexpected response from ${options.sourceLabel} API`);
}
