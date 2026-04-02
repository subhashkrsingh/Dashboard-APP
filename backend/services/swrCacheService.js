const fs = require("fs");
const { fetchSectorDataSafe } = require("./fetchService");
const { fetchIntradaySeriesFromNse } = require("./nseService");
const { buildIntradaySeries } = require("./intradaySeries");
const { getMarketStatus } = require("./marketStatus");
const { ALL_SECTORS, getSectorConfig } = require("./sectorRegistry");

const SECTORS = ALL_SECTORS;
const SNAPSHOT_TTL_MS = Math.max(Number(process.env.MARKET_CACHE_TTL_MS) || 30_000, 1_000);
const SOFT_REFRESH_MS = Math.max(Number(process.env.MARKET_CACHE_SOFT_REFRESH_MS) || 15_000, 1_000);
const INTRADAY_TTL_MS = Math.max(Number(process.env.INTRADAY_CACHE_TTL_MS) || 30_000, 1_000);
const INTRADAY_SOFT_REFRESH_MS = Math.max(Number(process.env.INTRADAY_SOFT_REFRESH_MS) || 15_000, 1_000);
const REFRESH_THROTTLE_MS = Math.max(Number(process.env.MARKET_REFRESH_THROTTLE_MS) || 5_000, 250);
const LIVE_PRIORITY_WAIT_MS = Math.max(Number(process.env.LIVE_PRIORITY_WAIT_MS) || 120, 25);
const REFRESH_HARD_TIMEOUT_MS = Math.max(Number(process.env.REFRESH_HARD_TIMEOUT_MS) || 12_000, 1_000);
const NSE_MIN_REQUEST_GAP_MS = Math.max(Number(process.env.NSE_MIN_REQUEST_GAP_MS) || 250, 50);
const NSE_RATE_LIMIT_COOLDOWN_MS = Math.max(Number(process.env.NSE_RATE_LIMIT_COOLDOWN_MS) || 15_000, 1_000);

function createEntry(ttl) {
  return {
    data: null,
    timestamp: 0,
    source: "cache",
    isStale: true,
    ttl,
    refreshing: false,
    lastAttemptAt: 0,
    lastSuccessAt: 0
  };
}

function createCache(ttl) {
  return Object.fromEntries(SECTORS.map(sector => [sector, createEntry(ttl)]));
}

const snapshotCache = createCache(SNAPSHOT_TTL_MS);
const intradayCache = createCache(INTRADAY_TTL_MS);
const bundledSnapshots = Object.fromEntries(SECTORS.map(sector => [sector, loadBundledSnapshot(sector)]));

const refreshPromises = {
  snapshot: Object.fromEntries(SECTORS.map(sector => [sector, null])),
  intraday: Object.fromEntries(SECTORS.map(sector => [sector, null]))
};

const lastRefreshError = {
  snapshot: Object.fromEntries(SECTORS.map(sector => [sector, null])),
  intraday: Object.fromEntries(SECTORS.map(sector => [sector, null]))
};

const globalNseWindow = {
  nextAllowedAt: 0,
  cooldownUntil: 0
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutHandle = null;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  });
}

function isValidSector(sector) {
  return SECTORS.includes(sector);
}

function hasData(entry) {
  return Boolean(entry?.data);
}

function getAgeMs(entry, now = Date.now()) {
  if (!entry?.timestamp) {
    return null;
  }

  return Math.max(0, now - entry.timestamp);
}

function isExpired(entry, now = Date.now()) {
  const ageMs = getAgeMs(entry, now);
  if (ageMs === null) {
    return true;
  }

  return ageMs > entry.ttl;
}

function isSoftExpired(entry, softWindowMs, now = Date.now()) {
  const ageMs = getAgeMs(entry, now);
  if (ageMs === null) {
    return true;
  }

  return ageMs >= softWindowMs;
}

function toErrorPayload(error, source) {
  if (!error) {
    return null;
  }

  return {
    code: error.code || error.statusCode || "REFRESH_FAILED",
    message: error.message || String(error),
    source,
    recordedAt: new Date().toISOString()
  };
}

function loadBundledSnapshot(sector) {
  const config = getSectorConfig(sector);
  const snapshotPath = config?.snapshotPath;

  if (!snapshotPath) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  } catch (error) {
    return null;
  }
}

function buildEmptySectorIndex(sector) {
  const config = getSectorConfig(sector);

  return {
    name: config?.indexName || String(sector || "").toUpperCase(),
    lastPrice: null,
    change: null,
    percentChange: null,
    indicativeClose: null,
    previousClose: null,
    open: null,
    dayHigh: null,
    dayLow: null,
    yearHigh: null,
    yearLow: null,
    tradedVolume: null,
    tradedValue: null,
    ffmCap: null,
    pe: null,
    pb: null
  };
}

function normalizeSnapshotPayload(sector, snapshot) {
  return {
    sectorIndex: snapshot?.sectorIndex || buildEmptySectorIndex(sector),
    companies: Array.isArray(snapshot?.companies) ? snapshot.companies : [],
    gainers: Array.isArray(snapshot?.gainers) ? snapshot.gainers : [],
    losers: Array.isArray(snapshot?.losers) ? snapshot.losers : [],
    advanceDecline:
      snapshot?.advanceDecline || {
        advances: 0,
        declines: 0,
        unchanged: 0
      },
    marketStatus: snapshot?.marketStatus || getMarketStatus(),
    sourceTimestamp: snapshot?.sourceTimestamp,
    fetchedAt: snapshot?.fetchedAt || new Date().toISOString(),
    fallbackIndexUsed: Boolean(snapshot?.fallbackIndexUsed),
    requestedIndex: snapshot?.requestedIndex || getSectorConfig(sector)?.indexName
  };
}

function buildSnapshotResponse(sector, snapshot, options = {}) {
  const {
    source = "cache",
    isStale = false,
    cacheAgeMs,
    message,
    lastError = null,
    cacheHeader = source === "live" ? "LIVE" : isStale ? "STALE" : "HIT",
    timestamp = Date.now()
  } = options;

  const normalized = normalizeSnapshotPayload(sector, snapshot);
  const dataStatus = message === "Live data temporarily unavailable" ? "offline" : source === "live" ? "live" : "cache";

  return {
    data: {
      ...normalized,
      source,
      isStale,
      stale: isStale,
      cached: source !== "live",
      dataStatus,
      cacheAgeMs,
      message,
      warning: message,
      lastRefreshError: lastError || undefined
    },
    cached: source !== "live",
    stale: isStale,
    timestamp,
    cache: {
      data: normalized.companies,
      timestamp,
      source,
      isStale
    },
    cacheHeader
  };
}

function buildOfflineSnapshotResponse(sector) {
  const message = "Live data temporarily unavailable";

  return buildSnapshotResponse(
    sector,
    {
      sectorIndex: buildEmptySectorIndex(sector),
      companies: [],
      gainers: [],
      losers: [],
      advanceDecline: {
        advances: 0,
        declines: 0,
        unchanged: 0
      },
      marketStatus: getMarketStatus(),
      fetchedAt: new Date().toISOString(),
      requestedIndex: getSectorConfig(sector)?.indexName
    },
    {
      source: "cache",
      isStale: true,
      cacheAgeMs: undefined,
      message,
      lastError: lastRefreshError.snapshot[sector],
      cacheHeader: "OFFLINE",
      timestamp: Date.now()
    }
  );
}

function buildSyntheticIntradayForSector(sector) {
  const config = getSectorConfig(sector);
  const seedSnapshot = snapshotCache[sector]?.data || bundledSnapshots[sector] || null;

  return {
    ...buildIntradaySeries(seedSnapshot, { seedPrice: config?.seedPrice }),
    source: "synthetic",
    fetchedAt: new Date().toISOString()
  };
}

function buildIntradayResponse(data, options = {}) {
  const {
    source = "cache",
    isStale = false,
    timestamp = Date.now(),
    cacheHeader = source === "live" ? "LIVE" : isStale ? "STALE" : "HIT"
  } = options;

  return {
    data,
    cached: source !== "live",
    stale: isStale,
    timestamp,
    cache: {
      data: [],
      timestamp,
      source,
      isStale
    },
    cacheHeader
  };
}

async function waitForGlobalNseWindow() {
  const now = Date.now();
  const waitUntil = Math.max(globalNseWindow.nextAllowedAt, globalNseWindow.cooldownUntil);

  if (waitUntil > now) {
    await delay(waitUntil - now);
  }

  globalNseWindow.nextAllowedAt = Date.now() + NSE_MIN_REQUEST_GAP_MS;
}

function registerNseFailure(error) {
  const statusCode = Number(error?.statusCode || 0);
  const errorCode = String(error?.code || "");

  if (statusCode === 429 || errorCode === "NSE_RATE_LIMIT") {
    globalNseWindow.cooldownUntil = Date.now() + NSE_RATE_LIMIT_COOLDOWN_MS;
  }
}

async function executeSnapshotRefresh(sector) {
  await waitForGlobalNseWindow();
  const result = await fetchSectorDataSafe(sector);

  if (result.ok && result.data) {
    return result.data;
  }

  throw result.error || new Error(`Unable to fetch ${sector} sector snapshot`);
}

async function executeIntradayRefresh(sector) {
  await waitForGlobalNseWindow();
  const config = getSectorConfig(sector);

  try {
    const liveSeries = await fetchIntradaySeriesFromNse(config?.intradayIndexName || config?.indexName);
    if (liveSeries) {
      return {
        ...liveSeries,
        source: "nse-live",
        fetchedAt: new Date().toISOString()
      };
    }
  } catch (error) {
    registerNseFailure(error);
  }

  return buildSyntheticIntradayForSector(sector);
}

function updateEntry(entry, payload, source = "live") {
  entry.data = payload;
  entry.timestamp = Date.now();
  entry.source = source;
  entry.isStale = false;
  entry.lastSuccessAt = entry.timestamp;
}

function shouldThrottle(entry, force) {
  if (force) {
    return false;
  }

  if (!entry.lastAttemptAt) {
    return false;
  }

  return Date.now() - entry.lastAttemptAt < REFRESH_THROTTLE_MS;
}

function resolveCache(type) {
  return type === "intraday" ? intradayCache : snapshotCache;
}

async function executeRefresh(type, sector) {
  if (type === "intraday") {
    return executeIntradayRefresh(sector);
  }

  return executeSnapshotRefresh(sector);
}

function scheduleRefresh(type, sector, reason, options = {}) {
  if (!isValidSector(sector)) {
    return Promise.resolve(null);
  }

  const { force = false } = options;
  const cache = resolveCache(type);
  const entry = cache[sector];
  const currentPromise = refreshPromises[type][sector];

  if (currentPromise) {
    return currentPromise;
  }

  if (hasData(entry) && shouldThrottle(entry, force)) {
    return Promise.resolve(entry.data);
  }

  entry.refreshing = true;
  entry.lastAttemptAt = Date.now();

  const promise = withTimeout(
    executeRefresh(type, sector),
    REFRESH_HARD_TIMEOUT_MS,
    `${type}:${sector} refresh timed out after ${REFRESH_HARD_TIMEOUT_MS}ms`
  )
    .then(payload => {
      updateEntry(entry, payload, "live");
      lastRefreshError[type][sector] = null;
      return payload;
    })
    .catch(error => {
      registerNseFailure(error);
      entry.isStale = true;
      lastRefreshError[type][sector] = toErrorPayload(error, `${type}:${reason}`);
      throw error;
    })
    .finally(() => {
      entry.refreshing = false;
      refreshPromises[type][sector] = null;
    });

  refreshPromises[type][sector] = promise;
  return promise;
}

async function waitBrieflyForRefresh(promise) {
  if (!promise) {
    return null;
  }

  const outcome = await Promise.race([
    promise.then(data => ({ kind: "resolved", data })).catch(() => ({ kind: "failed", data: null })),
    delay(LIVE_PRIORITY_WAIT_MS).then(() => ({ kind: "timeout", data: null }))
  ]);

  return outcome.kind === "resolved" ? outcome.data : null;
}

async function getSnapshotWithOptions(sector, options = {}) {
  if (!isValidSector(sector)) {
    return buildOfflineSnapshotResponse(sector);
  }

  const { preferLive = false } = options;
  const entry = snapshotCache[sector];
  const now = Date.now();
  const ageMs = getAgeMs(entry, now);
  const hasLiveCache = hasData(entry);
  const bundledSnapshot = bundledSnapshots[sector];

  if (hasLiveCache) {
    const softExpired = isSoftExpired(entry, SOFT_REFRESH_MS, now);
    const expired = isExpired(entry, now);

    if (preferLive || softExpired) {
      scheduleRefresh("snapshot", sector, softExpired ? "soft-refresh" : "prefer-live").catch(() => {
        // Keep serving cached data while background refresh runs.
      });
    }

    return buildSnapshotResponse(sector, entry.data, {
      source: "cache",
      isStale: expired,
      cacheAgeMs: ageMs ?? undefined,
      message: expired ? "Showing recent snapshot" : "Updated just now",
      lastError: lastRefreshError.snapshot[sector],
      cacheHeader: expired ? "STALE" : "HIT",
      timestamp: entry.timestamp
    });
  }

  const refreshPromise = scheduleRefresh("snapshot", sector, "cold-start", { force: true });
  const immediateLivePayload = await waitBrieflyForRefresh(refreshPromise);

  if (immediateLivePayload) {
    return buildSnapshotResponse(sector, immediateLivePayload, {
      source: "live",
      isStale: false,
      cacheAgeMs: 0,
      message: "Live market data",
      cacheHeader: "LIVE",
      timestamp: snapshotCache[sector].timestamp || Date.now()
    });
  }

  if (bundledSnapshot) {
    return buildSnapshotResponse(sector, bundledSnapshot, {
      source: "cache",
      isStale: true,
      cacheAgeMs: undefined,
      message: "Showing recent snapshot",
      lastError: lastRefreshError.snapshot[sector],
      cacheHeader: "SNAPSHOT",
      timestamp: Date.now()
    });
  }

  return buildOfflineSnapshotResponse(sector);
}

async function getSnapshot(sector) {
  return getSnapshotWithOptions(sector);
}

async function getIntraday(sector, options = {}) {
  if (!isValidSector(sector)) {
    return buildIntradayResponse(buildSyntheticIntradayForSector(sector), {
      source: "cache",
      isStale: true,
      cacheHeader: "OFFLINE"
    });
  }

  const { preferLive = false } = options;
  const entry = intradayCache[sector];
  const now = Date.now();

  if (hasData(entry)) {
    const softExpired = isSoftExpired(entry, INTRADAY_SOFT_REFRESH_MS, now);
    const expired = isExpired(entry, now);

    if (preferLive || softExpired) {
      scheduleRefresh("intraday", sector, softExpired ? "soft-refresh" : "prefer-live").catch(() => {
        // Background refresh only.
      });
    }

    return buildIntradayResponse(entry.data, {
      source: "cache",
      isStale: expired,
      timestamp: entry.timestamp,
      cacheHeader: expired ? "STALE" : "HIT"
    });
  }

  const refreshPromise = scheduleRefresh("intraday", sector, "cold-start", { force: true });
  const immediateLivePayload = await waitBrieflyForRefresh(refreshPromise);

  if (immediateLivePayload) {
    return buildIntradayResponse(immediateLivePayload, {
      source: "live",
      isStale: false,
      timestamp: intradayCache[sector].timestamp || Date.now(),
      cacheHeader: "LIVE"
    });
  }

  return buildIntradayResponse(buildSyntheticIntradayForSector(sector), {
    source: "cache",
    isStale: true,
    timestamp: Date.now(),
    cacheHeader: "SNAPSHOT"
  });
}

function refreshSectorInBackground(sector, options = {}) {
  const { type = "snapshot", reason = "manual", force = false } = options;

  return scheduleRefresh(type, sector, reason, { force })
    .then(() => true)
    .catch(() => false);
}

async function preloadCache() {
  await Promise.all(
    SECTORS.map(sector =>
      scheduleRefresh("snapshot", sector, "startup", { force: true }).catch(() => false)
    )
  );
}

function getCacheStats() {
  const now = Date.now();
  const stats = {};

  for (const sector of SECTORS) {
    const snapshotEntry = snapshotCache[sector];
    const intradayEntry = intradayCache[sector];

    stats[sector] = {
      snapshot: {
        hasData: hasData(snapshotEntry),
        source: hasData(snapshotEntry) ? snapshotEntry.source : null,
        isStale: isExpired(snapshotEntry, now),
        timestamp: snapshotEntry.timestamp || null,
        ageMs: getAgeMs(snapshotEntry, now),
        ttlMs: snapshotEntry.ttl,
        softRefreshMs: SOFT_REFRESH_MS,
        refreshing: snapshotEntry.refreshing,
        bundledAvailable: Boolean(bundledSnapshots[sector]),
        lastError: lastRefreshError.snapshot[sector]
      },
      intraday: {
        hasData: hasData(intradayEntry),
        source: hasData(intradayEntry) ? intradayEntry.source : null,
        isStale: isExpired(intradayEntry, now),
        timestamp: intradayEntry.timestamp || null,
        ageMs: getAgeMs(intradayEntry, now),
        ttlMs: intradayEntry.ttl,
        softRefreshMs: INTRADAY_SOFT_REFRESH_MS,
        refreshing: intradayEntry.refreshing,
        lastError: lastRefreshError.intraday[sector]
      }
    };
  }

  return stats;
}

function getCacheSize() {
  return SECTORS.reduce((count, sector) => {
    const snapshotCount = hasData(snapshotCache[sector]) ? 1 : 0;
    const intradayCount = hasData(intradayCache[sector]) ? 1 : 0;
    return count + snapshotCount + intradayCount;
  }, 0);
}

function clearCache(sector = null) {
  const targets = sector && isValidSector(sector) ? [sector] : SECTORS;

  for (const key of targets) {
    snapshotCache[key] = createEntry(SNAPSHOT_TTL_MS);
    intradayCache[key] = createEntry(INTRADAY_TTL_MS);
    refreshPromises.snapshot[key] = null;
    refreshPromises.intraday[key] = null;
    lastRefreshError.snapshot[key] = null;
    lastRefreshError.intraday[key] = null;
  }
}

module.exports = {
  cache: snapshotCache,
  intradayCache,
  SECTORS,
  SNAPSHOT_TTL_MS,
  SOFT_REFRESH_MS,
  INTRADAY_TTL_MS,
  getSnapshot,
  getSnapshotWithOptions,
  getIntraday,
  refreshSectorInBackground,
  preloadCache,
  getCacheStats,
  getCacheSize,
  clearCache
};
