/**
 * Production-grade in-memory cache with stale-while-revalidate semantics.
 *
 * Key guarantees:
 * - Requests always read from memory first (no request-path network wait).
 * - Refresh failures never clear good cached data.
 * - Only callers with no cache at all should return 500.
 */

const CACHE_TTL_MS = Math.max(Number(process.env.CACHE_TTL_MS) || 2 * 60 * 1000, 5000);
const CACHE_STALE_WHILE_REVALIDATE_MS = Math.max(
  Number(process.env.CACHE_STALE_WHILE_REVALIDATE_MS) || 5 * 60 * 1000,
  CACHE_TTL_MS
);
const CACHE_REFRESH_INTERVAL_MS = Math.max(Number(process.env.CACHE_REFRESH_INTERVAL_MS) || 30 * 1000, 5000);
const CACHE_REFRESH_MIN_INTERVAL_MS = Math.max(Number(process.env.CACHE_REFRESH_MIN_INTERVAL_MS) || 10 * 1000, 1000);

const cache = new Map();
const refreshTimers = new Map();

function logCacheEvent(level, event, sector, details = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    event,
    sector,
    ...details
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

function resolveRefreshIntervalMs(sector) {
  const sectorOverrides = {
    energy: Number(process.env.ENERGY_SECTOR_REFRESH_MS) || 0,
    oilGas: Number(process.env.OIL_GAS_SECTOR_REFRESH_MS) || 0,
    realEstate: Number(process.env.REAL_ESTATE_REFRESH_MS) || 0
  };

  const candidate = sectorOverrides[sector] || CACHE_REFRESH_INTERVAL_MS;
  return Math.max(candidate, 5000);
}

function initializeCacheEntry(sector) {
  if (!cache.has(sector)) {
    cache.set(sector, {
      data: null,
      lastSuccessfulSnapshot: null,
      lastUpdated: null,
      expiryAtMs: 0,
      isRefreshing: false,
      refreshPromise: null,
      lastRefreshAttemptAtMs: 0,
      refreshCount: 0,
      errorCount: 0,
      lastError: null
    });
  }

  return cache.get(sector);
}

function getSnapshot(entry) {
  return entry.data || entry.lastSuccessfulSnapshot || null;
}

function isFresh(entry, nowMs = Date.now()) {
  return Boolean(getSnapshot(entry) && entry.lastUpdated && nowMs <= entry.expiryAtMs);
}

function isWithinSwrWindow(entry, nowMs = Date.now()) {
  if (!entry.lastUpdated || !getSnapshot(entry)) {
    return false;
  }

  return nowMs <= entry.lastUpdated.getTime() + CACHE_STALE_WHILE_REVALIDATE_MS;
}

function buildCachePayload(entry, status) {
  const snapshot = getSnapshot(entry);
  return {
    data: snapshot,
    dataStatus: status,
    lastUpdated: entry.lastUpdated,
    refreshError: entry.lastError,
    ageMs: entry.lastUpdated ? Date.now() - entry.lastUpdated.getTime() : null,
    isRefreshing: entry.isRefreshing
  };
}

function setCacheData(sector, data) {
  const entry = initializeCacheEntry(sector);
  const nowMs = Date.now();

  entry.data = data;
  entry.lastSuccessfulSnapshot = data;
  entry.lastUpdated = new Date(nowMs);
  entry.expiryAtMs = nowMs + CACHE_TTL_MS;
  entry.errorCount = 0;
  entry.lastError = null;
}

function setCacheError(sector, error, reason) {
  const entry = initializeCacheEntry(sector);
  entry.errorCount += 1;
  entry.lastError = {
    message: error?.message || String(error),
    code: error?.code || "REFRESH_FAILED",
    statusCode: Number(error?.statusCode) || 503,
    reason: reason || "unknown",
    at: new Date().toISOString()
  };
}

function triggerBackgroundRefresh(sector, options = {}) {
  const { force = false, reason = "background" } = options;
  const entry = initializeCacheEntry(sector);
  const nowMs = Date.now();

  if (entry.refreshPromise) {
    return entry.refreshPromise;
  }

  if (!force && entry.lastRefreshAttemptAtMs && nowMs - entry.lastRefreshAttemptAtMs < CACHE_REFRESH_MIN_INTERVAL_MS) {
    return null;
  }

  entry.isRefreshing = true;
  entry.lastRefreshAttemptAtMs = nowMs;
  entry.refreshCount += 1;
  const attempt = entry.refreshCount;
  const startedAtMs = Date.now();

  logCacheEvent("info", "REFRESH START", sector, { reason, attempt });

  const fetchService = require("./fetchService");

  const refreshPromise = fetchService
    .fetchSectorData(sector)
    .then((data) => {
      setCacheData(sector, data);
      const updatedEntry = initializeCacheEntry(sector);
      logCacheEvent("info", "REFRESH SUCCESS", sector, {
        reason,
        attempt,
        durationMs: Date.now() - startedAtMs,
        lastUpdated: updatedEntry.lastUpdated?.toISOString() || null
      });
      return data;
    })
    .catch((error) => {
      setCacheError(sector, error, reason);
      logCacheEvent("error", "REFRESH FAILED", sector, {
        reason,
        attempt,
        durationMs: Date.now() - startedAtMs,
        error: error?.message || String(error)
      });
      throw error;
    })
    .finally(() => {
      const currentEntry = initializeCacheEntry(sector);
      currentEntry.isRefreshing = false;
      currentEntry.refreshPromise = null;
    });

  entry.refreshPromise = refreshPromise;
  return refreshPromise;
}

function getCacheEntry(sector) {
  const entry = initializeCacheEntry(sector);
  const snapshot = getSnapshot(entry);

  if (!snapshot) {
    triggerBackgroundRefresh(sector, { reason: "empty-cache" })?.catch(() => {
      // Failure is tracked in cache metadata; callers still receive immediate response.
    });
    return buildCachePayload(entry, "stale");
  }

  const ageMs = entry.lastUpdated ? Date.now() - entry.lastUpdated.getTime() : null;

  if (isFresh(entry)) {
    logCacheEvent("info", "CACHE HIT", sector, {
      dataStatus: "fresh",
      ageMs
    });
    return buildCachePayload(entry, "fresh");
  }

  logCacheEvent("warn", "CACHE STALE", sector, {
    dataStatus: "stale",
    ageMs,
    withinSwrWindow: isWithinSwrWindow(entry)
  });

  triggerBackgroundRefresh(sector, { reason: "stale-read" })?.catch(() => {
    // Failure is tracked in cache metadata; stale data remains available.
  });

  return buildCachePayload(entry, "stale");
}

function refreshCache(sector, options = {}) {
  return triggerBackgroundRefresh(sector, {
    force: true,
    reason: options.reason || "manual"
  });
}

function startSectorRefreshInterval(sector, customIntervalMs = null) {
  if (refreshTimers.has(sector)) {
    return refreshTimers.get(sector);
  }

  const intervalMs = Math.max(customIntervalMs || resolveRefreshIntervalMs(sector), 5000);
  const timer = setInterval(() => {
    const refreshPromise = triggerBackgroundRefresh(sector, { reason: "interval" });
    if (refreshPromise?.catch) {
      refreshPromise.catch(() => {
        // Error metadata/logging already handled by triggerBackgroundRefresh.
      });
    }
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  refreshTimers.set(sector, timer);
  logCacheEvent("info", "REFRESH INTERVAL START", sector, { intervalMs });
  return timer;
}

function startSectorRefreshIntervals(sectors = []) {
  sectors.forEach((sector) => {
    startSectorRefreshInterval(sector);
  });
}

function stopSectorRefreshInterval(sector) {
  const timer = refreshTimers.get(sector);
  if (!timer) {
    return false;
  }

  clearInterval(timer);
  refreshTimers.delete(sector);
  return true;
}

function stopAllSectorRefreshIntervals() {
  for (const sector of refreshTimers.keys()) {
    stopSectorRefreshInterval(sector);
  }
}

function getCacheStats() {
  const nowMs = Date.now();
  const stats = {};

  for (const [sector, entry] of cache.entries()) {
    const snapshot = getSnapshot(entry);
    stats[sector] = {
      dataStatus: isFresh(entry, nowMs) ? "fresh" : "stale",
      hasData: Boolean(snapshot),
      isRefreshing: entry.isRefreshing,
      ageMs: entry.lastUpdated ? nowMs - entry.lastUpdated.getTime() : null,
      ttlMsRemaining: entry.lastUpdated ? Math.max(entry.expiryAtMs - nowMs, 0) : null,
      withinSwrWindow: isWithinSwrWindow(entry, nowMs),
      refreshCount: entry.refreshCount,
      errorCount: entry.errorCount,
      lastUpdated: entry.lastUpdated,
      refreshError: entry.lastError
    };
  }

  return stats;
}

function clearCache(sector = null) {
  if (sector) {
    cache.delete(sector);
    return;
  }

  cache.clear();
}

function getCacheSize() {
  return cache.size;
}

module.exports = {
  getCacheEntry,
  setCacheData,
  triggerBackgroundRefresh,
  refreshCache,
  startSectorRefreshInterval,
  startSectorRefreshIntervals,
  stopSectorRefreshInterval,
  stopAllSectorRefreshIntervals,
  getCacheStats,
  clearCache,
  getCacheSize,
  CACHE_TTL_MS,
  CACHE_STALE_WHILE_REVALIDATE_MS,
  CACHE_REFRESH_INTERVAL_MS
};
