const fs = require("fs");
const path = require("path");
const { fetchSectorDataSafe } = require("./fetchService");
const { fetchIntradaySeriesFromNse } = require("./nseService");
const { buildIntradaySeries } = require("./intradaySeries");

const SECTORS = ["energy", "oilGas", "realEstate"];
const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const INTRADAY_TTL_MS = 60 * 1000;

const INTRADAY_INDEX_BY_SECTOR = {
  energy: "NIFTY ENERGY",
  oilGas: "NIFTY OIL & GAS",
  realEstate: "NIFTY REALTY"
};

const INTRADAY_SEED_PRICE_BY_SECTOR = {
  energy: 24500,
  oilGas: 11230,
  realEstate: 3800
};

const SNAPSHOT_FILES = {
  energy: path.join(__dirname, "..", "data", "energySectorSnapshot.json"),
  oilGas: path.join(__dirname, "..", "data", "oilGasSectorSnapshot.json"),
  realEstate: path.join(__dirname, "..", "data", "realEstateSectorSnapshot.json")
};

function createEntry(ttl) {
  return {
    data: null,
    timestamp: 0,
    ttl,
    refreshing: false
  };
}

function createCache(ttl) {
  return {
    energy: createEntry(ttl),
    oilGas: createEntry(ttl),
    realEstate: createEntry(ttl)
  };
}

const snapshotCache = createCache(SNAPSHOT_TTL_MS);
const intradayCache = createCache(INTRADAY_TTL_MS);

const refreshPromises = {
  snapshot: {
    energy: null,
    oilGas: null,
    realEstate: null
  },
  intraday: {
    energy: null,
    oilGas: null,
    realEstate: null
  }
};

const lastRefreshError = {
  snapshot: {
    energy: null,
    oilGas: null,
    realEstate: null
  },
  intraday: {
    energy: null,
    oilGas: null,
    realEstate: null
  }
};

function isValidSector(sector) {
  return SECTORS.includes(sector);
}

function toErrorPayload(error, source) {
  if (!error) {
    return null;
  }

  return {
    code: error.code || error.statusCode || "REFRESH_FAILED",
    message: error.message || String(error),
    source,
    at: new Date().toISOString()
  };
}

function hasData(entry) {
  return entry.timestamp > 0 && entry.data !== null;
}

function isStale(entry, now = Date.now()) {
  if (!hasData(entry)) {
    return true;
  }

  return now - entry.timestamp > entry.ttl;
}

function updateEntry(entry, data) {
  entry.data = data;
  entry.timestamp = Date.now();
}

function loadBundledSnapshot(sector) {
  const snapshotPath = SNAPSHOT_FILES[sector];
  if (!snapshotPath) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  } catch (error) {
    return null;
  }
}

function buildSyntheticIntradayForSector(sector) {
  const seedPrice = INTRADAY_SEED_PRICE_BY_SECTOR[sector];
  const seedSnapshot = snapshotCache[sector].data;
  return {
    ...buildIntradaySeries(seedSnapshot, { seedPrice }),
    source: "synthetic",
    fetchedAt: new Date().toISOString()
  };
}

async function fetchSnapshotForSector(sector) {
  const result = await fetchSectorDataSafe(sector);
  if (result.ok && result.data) {
    return result.data;
  }

  throw result.error || new Error(`Unable to fetch ${sector} snapshot`);
}

async function fetchIntradayForSector(sector) {
  const indexName = INTRADAY_INDEX_BY_SECTOR[sector];

  try {
    const nseSeries = await fetchIntradaySeriesFromNse(indexName);
    if (nseSeries) {
      return {
        ...nseSeries,
        source: "nse-live",
        fetchedAt: new Date().toISOString()
      };
    }
  } catch (error) {
    // Silent fallback to synthetic intraday curve.
  }

  return buildSyntheticIntradayForSector(sector);
}

function resolveCache(type) {
  if (type === "snapshot") {
    return snapshotCache;
  }

  if (type === "intraday") {
    return intradayCache;
  }

  throw new Error(`Unknown cache type: ${type}`);
}

async function executeRefresh(type, sector) {
  if (type === "snapshot") {
    return fetchSnapshotForSector(sector);
  }

  if (type === "intraday") {
    return fetchIntradayForSector(sector);
  }

  throw new Error(`Unknown refresh type: ${type}`);
}

function scheduleRefresh(type, sector, reason) {
  const cache = resolveCache(type);
  const entry = cache[sector];
  const currentPromise = refreshPromises[type][sector];

  if (entry.refreshing || currentPromise) {
    console.warn(`[REFRESH SKIPPED] ${type}:${sector} (${reason})`);
    return currentPromise || Promise.resolve(entry.data);
  }

  entry.refreshing = true;
  console.log(`[REFRESH START] ${type}:${sector} (${reason})`);

  const promise = (async () => {
    try {
      const payload = await executeRefresh(type, sector);
      updateEntry(entry, payload);
      lastRefreshError[type][sector] = null;
      console.log(`[REFRESH SUCCESS] ${type}:${sector}`);
      return payload;
    } catch (error) {
      lastRefreshError[type][sector] = toErrorPayload(error, `${type}:${reason}`);
      console.error(`[REFRESH FAILED] ${type}:${sector}`, error?.message || error);
      throw error;
    } finally {
      entry.refreshing = false;
      refreshPromises[type][sector] = null;
    }
  })();

  refreshPromises[type][sector] = promise;
  return promise;
}

async function getOrRefresh(type, sector) {
  if (!isValidSector(sector)) {
    throw new Error(`Invalid sector: ${sector}`);
  }

  const cache = resolveCache(type);
  const entry = cache[sector];
  const now = Date.now();
  const available = hasData(entry);
  const stale = isStale(entry, now);

  if (available && !stale) {
    console.log(`[CACHE HIT] ${type}:${sector}`);
    return {
      data: entry.data,
      cached: true,
      stale: false,
      timestamp: new Date(entry.timestamp).toISOString()
    };
  }

  if (available && stale) {
    console.warn(`[CACHE STALE] ${type}:${sector}`);
    scheduleRefresh(type, sector, "stale-read").catch(() => {
      // Intentionally silent: stale cache is still served.
    });
    return {
      data: entry.data,
      cached: true,
      stale: true,
      timestamp: new Date(entry.timestamp).toISOString()
    };
  }

  if (type === "intraday" && !available) {
    const immediateSynthetic = buildSyntheticIntradayForSector(sector);
    updateEntry(entry, immediateSynthetic);
    scheduleRefresh(type, sector, "cache-miss").catch(() => {
      // Keep serving the synthetic fallback until a live refresh succeeds.
    });
    return {
      data: entry.data,
      cached: false,
      stale: false,
      timestamp: new Date(entry.timestamp).toISOString()
    };
  }

  if (type === "snapshot" && !available) {
    const bundledSnapshot = loadBundledSnapshot(sector);
    if (bundledSnapshot) {
      console.warn(`[CACHE STALE] snapshot:${sector} (bundled-fallback)`);
      updateEntry(entry, bundledSnapshot);
      scheduleRefresh(type, sector, "cache-miss").catch(() => {
        // Keep serving bundled snapshot until live fetch succeeds.
      });
      return {
        data: entry.data,
        cached: true,
        stale: true,
        timestamp: new Date(entry.timestamp).toISOString()
      };
    }
  }

  try {
    const hadDataBeforeRefresh = available;
    await scheduleRefresh(type, sector, "cache-miss");
    return {
      data: entry.data,
      cached: hadDataBeforeRefresh,
      stale: false,
      timestamp: new Date(entry.timestamp).toISOString()
    };
  } catch (error) {
    if (hasData(entry)) {
      return {
        data: entry.data,
        cached: true,
        stale: true,
        timestamp: new Date(entry.timestamp).toISOString()
      };
    }

    throw error;
  }
}

function getSnapshot(sector) {
  return getOrRefresh("snapshot", sector);
}

function getIntraday(sector) {
  return getOrRefresh("intraday", sector);
}

function refreshSectorInBackground(sector, options = {}) {
  const { type = "snapshot", reason = "manual" } = options;
  if (!isValidSector(sector)) {
    return Promise.resolve(false);
  }

  return scheduleRefresh(type, sector, reason)
    .then(() => true)
    .catch(() => false);
}

async function preloadCache() {
  const preloadTasks = SECTORS.map(async sector => {
    try {
      await scheduleRefresh("snapshot", sector, "startup");
    } catch (error) {
      const fallbackSnapshot = loadBundledSnapshot(sector);
      if (fallbackSnapshot) {
        console.warn(`[CACHE STALE] snapshot:${sector} (startup-bundled-fallback)`);
        updateEntry(snapshotCache[sector], fallbackSnapshot);
      }
    }
  });
  await Promise.all(preloadTasks);
}

function getCacheStats() {
  const now = Date.now();
  const stats = {};

  for (const sector of SECTORS) {
    const snapshotEntry = snapshotCache[sector];
    const intradayEntry = intradayCache[sector];
    const snapshotAgeMs = snapshotEntry.timestamp ? Math.max(0, now - snapshotEntry.timestamp) : null;
    const intradayAgeMs = intradayEntry.timestamp ? Math.max(0, now - intradayEntry.timestamp) : null;

    stats[sector] = {
      snapshot: {
        hasData: hasData(snapshotEntry),
        stale: isStale(snapshotEntry, now),
        timestamp: snapshotEntry.timestamp ? new Date(snapshotEntry.timestamp).toISOString() : null,
        ageMs: snapshotAgeMs,
        ttlMs: snapshotEntry.ttl,
        refreshing: snapshotEntry.refreshing,
        lastError: lastRefreshError.snapshot[sector]
      },
      intraday: {
        hasData: hasData(intradayEntry),
        stale: isStale(intradayEntry, now),
        timestamp: intradayEntry.timestamp ? new Date(intradayEntry.timestamp).toISOString() : null,
        ageMs: intradayAgeMs,
        ttlMs: intradayEntry.ttl,
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
  INTRADAY_TTL_MS,
  getSnapshot,
  getIntraday,
  refreshSectorInBackground,
  preloadCache,
  getCacheStats,
  getCacheSize,
  clearCache
};
