import type {
  CompanyQuote,
  SectorIndex,
  SectorIntradayResponse,
  SectorReturns,
  SectorSnapshot
} from "../types/market";

import { getApiResource, postApiResource } from "./apiClient";
import { SECTOR_API_MAP, type SectorApiConfig, type SectorId } from "./sectorApiMap";

export interface NormalizeOptions {
  defaultIndexName: string;
  sourceLabel: string;
  apiCacheStatus?: string;
}

interface SectorIntradayNormalizeOptions {
  sourceLabel: string;
}

interface CacheEnvelope {
  data: unknown;
  cacheMeta?: {
    stale?: boolean;
    cached?: boolean;
    timestamp?: unknown;
    source?: unknown;
    isStale?: boolean;
  };
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

function toIsoTimestamp(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return undefined;
  }

  const numeric = Number(text);
  if (Number.isFinite(numeric) && !text.includes("-") && !text.includes(":")) {
    return new Date(numeric).toISOString();
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function unwrapCacheEnvelope(payload: unknown): CacheEnvelope {
  if (!isObject(payload) || !("data" in payload)) {
    return { data: payload };
  }

  const cacheMetaFromLegacy = {
    stale: typeof payload.stale === "boolean" ? payload.stale : undefined,
    cached: typeof payload.cached === "boolean" ? payload.cached : undefined,
    timestamp: payload.timestamp,
    source: payload.source,
    isStale: typeof payload.isStale === "boolean" ? payload.isStale : undefined
  };

  if (isObject(payload._cache)) {
    return {
      data: payload.data,
      cacheMeta: {
        stale: typeof payload._cache.stale === "boolean" ? payload._cache.stale : cacheMetaFromLegacy.stale,
        cached: cacheMetaFromLegacy.cached ?? (typeof payload._cache.stale === "boolean" ? true : undefined),
        timestamp: payload._cache.timestamp ?? cacheMetaFromLegacy.timestamp,
        source: payload._cache.source ?? cacheMetaFromLegacy.source,
        isStale:
          typeof payload._cache.isStale === "boolean" ? payload._cache.isStale : cacheMetaFromLegacy.isStale
      }
    };
  }

  return {
    data: payload.data,
    cacheMeta: cacheMetaFromLegacy
  };
}

function normalizeSource(value: unknown): SectorSnapshot["source"] | undefined {
  return value === "live" || value === "cache" ? value : undefined;
}

function normalizeDataStatus(
  value: unknown,
  legacy: {
    stale?: boolean;
    snapshot?: boolean;
    source?: SectorSnapshot["source"];
    isEmpty?: boolean;
  } = {}
): SectorSnapshot["dataStatus"] {
  if (value === "live" || value === "cache" || value === "offline") {
    return value;
  }

  if (legacy.snapshot || legacy.isEmpty) {
    return "offline";
  }

  if (legacy.stale || legacy.source === "cache") {
    return "cache";
  }

  return "live";
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
    const source = normalizeSource(payload.source);
    const isStale = typeof payload.isStale === "boolean" ? payload.isStale : undefined;
    const dataStatus = normalizeDataStatus(payload.dataStatus, {
      stale: typeof payload.stale === "boolean" ? payload.stale : isStale,
      snapshot: Boolean(payload.snapshot),
      source,
      isEmpty: Array.isArray(payload.companies) && payload.companies.length === 0 && !payload.sectorIndex?.lastPrice
    });

    return {
      ...payload,
      sectorIndex: normalizeSectorIndex(payload.sectorIndex, options.defaultIndexName),
      companies: normalizeCompanies(payload.companies),
      gainers: normalizeCompanies(payload.gainers),
      losers: normalizeCompanies(payload.losers),
      fetchedAt: String(payload.fetchedAt ?? new Date().toISOString()),
      apiCacheStatus: options.apiCacheStatus,
      lastRefreshError: normalizeLastRefreshError(payload.lastRefreshError),
      source,
      isStale,
      stale: typeof payload.stale === "boolean" ? payload.stale : isStale,
      cached: typeof payload.cached === "boolean" ? payload.cached : source === "cache",
      dataStatus,
      message: payload.message ? String(payload.message) : undefined,
      warning: payload.warning ? String(payload.warning) : payload.message ? String(payload.message) : undefined
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
      source: normalizeSource(payload.source),
      isStale: typeof payload.isStale === "boolean" ? payload.isStale : Boolean(payload.stale),
      stale: Boolean(payload.stale),
      message: payload.message ? String(payload.message) : undefined,
      warning: payload.warning ? String(payload.warning) : payload.message ? String(payload.message) : undefined,
      cached: Boolean(payload.cached),
      apiCacheStatus: options.apiCacheStatus,
      lastRefreshError: normalizeLastRefreshError(payload.lastRefreshError),
      dataStatus: normalizeDataStatus(payload.dataStatus, {
        stale: Boolean(payload.stale),
        snapshot: Boolean(payload.snapshot),
        source: normalizeSource(payload.source),
        isEmpty: Array.isArray(payload.companies) && payload.companies.length === 0 && !sectorLast
      })
    };
  }

  throw new Error(`Unexpected response from ${options.sourceLabel} API`);
}

export function normalizeIntradayResponse(
  payload: unknown,
  options: SectorIntradayNormalizeOptions
): SectorIntradayResponse {
  const unwrapped = unwrapCacheEnvelope(payload);
  const normalizedPayload = unwrapped.data;

  if (!isObject(normalizedPayload) || !Array.isArray(normalizedPayload.time) || !Array.isArray(normalizedPayload.value)) {
    throw new Error(`Unexpected intraday response from ${options.sourceLabel} API`);
  }

  return {
    time: normalizedPayload.time.map(point => String(point)),
    value: normalizedPayload.value.map(point => toNumberOrNull(point) ?? 0),
    source: normalizedPayload.source ? String(normalizedPayload.source) : undefined,
    fetchedAt: String(
      normalizedPayload.fetchedAt ??
        toIsoTimestamp(unwrapped.cacheMeta?.timestamp) ??
        new Date().toISOString()
    )
  };
}

function normalizeSectorFromResponse(response: { data: unknown; cacheStatus?: string }, options: Omit<NormalizeOptions, "apiCacheStatus">) {
  const unwrapped = unwrapCacheEnvelope(response.data);
  const normalized = normalizeSectorResponse(unwrapped.data, {
    ...options,
    apiCacheStatus: response.cacheStatus
  });

  if (!unwrapped.cacheMeta) {
    return normalized;
  }

  return {
    ...normalized,
    source: normalizeSource(unwrapped.cacheMeta.source) ?? normalized.source,
    isStale:
      typeof unwrapped.cacheMeta.isStale === "boolean"
        ? unwrapped.cacheMeta.isStale
        : typeof unwrapped.cacheMeta.stale === "boolean"
        ? unwrapped.cacheMeta.stale
        : normalized.isStale,
    stale: typeof unwrapped.cacheMeta.stale === "boolean" ? unwrapped.cacheMeta.stale : normalized.stale,
    cached: typeof unwrapped.cacheMeta.cached === "boolean" ? unwrapped.cacheMeta.cached : normalized.cached,
    fetchedAt: toIsoTimestamp(unwrapped.cacheMeta.timestamp) ?? normalized.fetchedAt
  };
}

function resolveSectorConfig(sector: SectorId): SectorApiConfig {
  return SECTOR_API_MAP[sector];
}

export async function fetchSectorSnapshotById(sector: SectorId): Promise<SectorSnapshot> {
  const config = resolveSectorConfig(sector);
  const response = await getApiResource<unknown>(config.snapshotPath, `${config.sourceLabel} snapshot`);
  return normalizeSectorFromResponse(response, config);
}

export async function forceRefreshSectorSnapshotById(sector: SectorId): Promise<SectorSnapshot> {
  const config = resolveSectorConfig(sector);
  const response = await postApiResource<unknown>(`${config.snapshotPath}/refresh`, `${config.sourceLabel} refresh`, {
    force: true,
    bypassCache: true
  });
  return normalizeSectorFromResponse(response, config);
}

export async function fetchSectorIntradayById(sector: SectorId): Promise<SectorIntradayResponse> {
  const config = resolveSectorConfig(sector);
  const response = await getApiResource<unknown>(config.intradayPath, `${config.sourceLabel} intraday`);
  return normalizeIntradayResponse(response.data, { sourceLabel: config.sourceLabel });
}
