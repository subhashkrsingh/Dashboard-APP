const fs = require("fs");
const path = require("path");
const { fetchSectorDataSafe } = require("./fetchService");

const SECTORS = ["energy", "oilGas", "realEstate"];
const CACHE_FRESH_MS = Math.max(Number(process.env.CACHE_FRESH_MS) || 60 * 1000, 1000);

const SNAPSHOT_FILES = {
  energy: path.join(__dirname, "..", "data", "energySectorSnapshot.json"),
  oilGas: path.join(__dirname, "..", "data", "oilGasSectorSnapshot.json"),
  realEstate: path.join(__dirname, "..", "data", "realEstateSectorSnapshot.json")
};

const cache = {
  energy: {
    data: null,
    lastUpdated: null,
    status: "stale",
    error: null
  },
  oilGas: {
    data: null,
    lastUpdated: null,
    status: "stale",
    error: null
  },
  realEstate: {
    data: null,
    lastUpdated: null,
    status: "stale",
    error: null
  }
};

const refreshState = {
  energy: { isRefreshing: false, promise: null, refreshCount: 0 },
  oilGas: { isRefreshing: false, promise: null, refreshCount: 0 },
  realEstate: { isRefreshing: false, promise: null, refreshCount: 0 }
};

function isValidSector(sector) {
  return Object.prototype.hasOwnProperty.call(cache, sector);
}

function toErrorPayload(error, reason = "refresh") {
  if (!error) return null;
  return {
    reason,
    message: error?.message || String(error),
    code: error?.code || "REFRESH_FAILED",
    at: new Date().toISOString()
  };
}

function computeStatus(sector) {
  const entry = cache[sector];

  if (!entry.data || !entry.lastUpdated) {
    entry.status = "stale";
    return entry.status;
  }

  const ageMs = Date.now() - entry.lastUpdated.getTime();
  entry.status = ageMs <= CACHE_FRESH_MS ? "fresh" : "stale";
  return entry.status;
}

function getSectorState(sector, options = {}) {
  const { triggerRefresh = true, reason = "read" } = options;
  if (!isValidSector(sector)) {
    return {
      hasData: false,
      data: null,
      status: "stale",
      lastUpdated: null,
      error: toErrorPayload(new Error(`Unknown sector: ${sector}`), reason),
      isRefreshing: false
    };
  }

  const status = computeStatus(sector);
  const entry = cache[sector];
  const state = refreshState[sector];
  const hasData = Boolean(entry.data);

  if (hasData && status === "fresh") {
    console.log(`[CACHE HIT] ${sector}`);
  } else if (hasData) {
    console.warn(`[CACHE STALE] ${sector}`);
    if (triggerRefresh) {
      refreshSectorInBackground(sector, { reason }).catch(() => {
        // refresh errors are captured in cache state
      });
    }
  } else if (triggerRefresh) {
    refreshSectorInBackground(sector, { reason: "warmup-miss" }).catch(() => {
      // refresh errors are captured in cache state
    });
  }

  return {
    hasData,
    data: entry.data,
    status,
    lastUpdated: entry.lastUpdated,
    error: entry.error,
    isRefreshing: state.isRefreshing
  };
}

function loadBundledSnapshot(sector) {
  const snapshotPath = SNAPSHOT_FILES[sector];
  if (!snapshotPath) return null;

  try {
    return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  } catch (error) {
    return null;
  }
}

function updateCacheData(sector, data, { status = "fresh", error = null } = {}) {
  cache[sector].data = data;
  cache[sector].lastUpdated = new Date();
  cache[sector].status = status;
  cache[sector].error = error;
}

async function refreshSectorInBackground(sector, options = {}) {
  const { reason = "background", force = false } = options;

  if (!isValidSector(sector)) {
    return false;
  }

  const state = refreshState[sector];
  if (!force && state.promise) {
    return state.promise;
  }

  state.isRefreshing = true;
  state.refreshCount += 1;
  console.log(`[REFRESH START] ${sector}`);

  const refreshPromise = (async () => {
    const result = await fetchSectorDataSafe(sector);

    if (result.ok && result.data) {
      updateCacheData(sector, result.data, { status: "fresh", error: null });
      console.log(`[REFRESH SUCCESS] ${sector}`);
      return true;
    }

    const existingData = cache[sector].data;
    cache[sector].status = existingData ? "stale" : "stale";
    cache[sector].error = toErrorPayload(result.error, reason);
    console.error(`[REFRESH FAILED] ${sector}`);
    return false;
  })()
    .catch((error) => {
      const existingData = cache[sector].data;
      cache[sector].status = existingData ? "stale" : "stale";
      cache[sector].error = toErrorPayload(error, reason);
      console.error(`[REFRESH FAILED] ${sector}`);
      return false;
    })
    .finally(() => {
      state.isRefreshing = false;
      state.promise = null;
    });

  state.promise = refreshPromise;
  return refreshPromise;
}

async function warmSector(sector) {
  console.log(`[REFRESH START] ${sector}`);
  const liveResult = await fetchSectorDataSafe(sector);
  if (liveResult.ok && liveResult.data) {
    updateCacheData(sector, liveResult.data, { status: "fresh", error: null });
    console.log(`[REFRESH SUCCESS] ${sector}`);
    return true;
  }

  const fallback = loadBundledSnapshot(sector);
  if (fallback) {
    updateCacheData(sector, fallback, {
      status: "stale",
      error: toErrorPayload(liveResult.error, "warmup-fallback")
    });
    console.error(`[REFRESH FAILED] ${sector}`);
    return true;
  }

  cache[sector].error = toErrorPayload(liveResult.error, "warmup");
  console.error(`[REFRESH FAILED] ${sector}`);
  return false;
}

async function warmAllSectors() {
  console.log("[CACHE WARM] start");
  const tasks = SECTORS.map(sector => warmSector(sector));
  const results = await Promise.all(tasks);

  const failedSectors = SECTORS.filter((_sector, index) => !results[index]);
  if (failedSectors.length > 0) {
    console.error(`[CACHE WARM] failed sectors: ${failedSectors.join(", ")}`);
    throw new Error(`Cache warmup failed for sectors: ${failedSectors.join(", ")}`);
  }

  console.log("[CACHE WARM] complete");
}

function getCacheStats() {
  const stats = {};

  for (const sector of SECTORS) {
    const entry = cache[sector];
    const state = refreshState[sector];
    const status = computeStatus(sector);
    const ageMs = entry.lastUpdated ? Date.now() - entry.lastUpdated.getTime() : null;

    stats[sector] = {
      hasData: Boolean(entry.data),
      status,
      dataStatus: status,
      lastUpdated: entry.lastUpdated,
      ageMs,
      error: entry.error,
      refreshError: entry.error,
      isRefreshing: state.isRefreshing,
      refreshCount: state.refreshCount
    };
  }

  return stats;
}

function getCacheSize() {
  return SECTORS.filter(sector => Boolean(cache[sector].data)).length;
}

function refreshCache(sector, options = {}) {
  return refreshSectorInBackground(sector, options);
}

function clearCache(sector = null) {
  if (sector && isValidSector(sector)) {
    cache[sector] = {
      data: null,
      lastUpdated: null,
      status: "stale",
      error: null
    };
    return;
  }

  for (const key of SECTORS) {
    cache[key] = {
      data: null,
      lastUpdated: null,
      status: "stale",
      error: null
    };
  }
}

module.exports = {
  cache,
  SECTORS,
  CACHE_FRESH_MS,
  CACHE_TTL_MS: CACHE_FRESH_MS,
  CACHE_STALE_WHILE_REVALIDATE_MS: CACHE_FRESH_MS,
  getSectorState,
  refreshSectorInBackground,
  refreshCache,
  preloadCache: warmAllSectors,
  warmAllSectors,
  getCacheStats,
  getCacheSize,
  clearCache
};
