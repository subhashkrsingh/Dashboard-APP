const CACHE_TTL_MS = 120000;
const REFRESH_RETRY_MS = 10000;

const cacheStore = new Map();

function getOrCreateEntry(key) {
  const existing = cacheStore.get(key);
  if (existing) {
    return existing;
  }

  const nextEntry = {
    data: null,
    timestamp: 0,
    refreshing: false,
    error: null,
    refreshPromise: null,
    retryTimer: null,
    retryScheduledAt: 0
  };

  cacheStore.set(key, nextEntry);
  return nextEntry;
}

function hasData(entry) {
  return entry.timestamp > 0 && entry.data !== null;
}

function isFresh(entry, now = Date.now()) {
  return hasData(entry) && now - entry.timestamp < CACHE_TTL_MS;
}

function ageMs(entry, now = Date.now()) {
  if (!hasData(entry)) {
    return 0;
  }

  return Math.max(0, now - entry.timestamp);
}

function clearRetryTimer(entry) {
  if (!entry.retryTimer) {
    return;
  }

  clearTimeout(entry.retryTimer);
  entry.retryTimer = null;
  entry.retryScheduledAt = 0;
}

function buildResponse(entry, { stale, message }) {
  const base =
    entry.data && typeof entry.data === "object" && !Array.isArray(entry.data)
      ? { ...entry.data }
      : { data: entry.data };

  return {
    ...base,
    _cache: {
      stale,
      message,
      age: ageMs(entry),
      timestamp: entry.timestamp
    }
  };
}

function scheduleRetry(key, fetchFn, entry) {
  if (entry.retryTimer) {
    return;
  }

  entry.retryScheduledAt = Date.now();
  entry.retryTimer = setTimeout(async () => {
    entry.retryTimer = null;
    entry.retryScheduledAt = 0;

    try {
      await refreshKey(key, fetchFn, entry, "retry");
    } catch (error) {
      // refreshKey already logs and re-schedules retry on failure.
    }
  }, REFRESH_RETRY_MS);
}

async function refreshKey(key, fetchFn, entry = getOrCreateEntry(key), reason = "manual") {
  if (entry.refreshing && entry.refreshPromise) {
    return entry.refreshPromise;
  }

  clearRetryTimer(entry);
  entry.refreshing = true;
  console.log(`[REFRESH START] ${key} (${reason})`);

  const refreshPromise = Promise.resolve()
    .then(() => fetchFn())
    .then(data => {
      entry.data = data;
      entry.timestamp = Date.now();
      entry.error = null;
      console.log(`[REFRESH SUCCESS] ${key} (${reason})`);
      return data;
    })
    .catch(error => {
      entry.error = {
        message: error?.message || String(error),
        at: Date.now()
      };
      console.error(`[REFRESH FAILED] ${key} (${reason})`, error?.message || error);
      scheduleRetry(key, fetchFn, entry);
      throw error;
    })
    .finally(() => {
      entry.refreshing = false;
      entry.refreshPromise = null;
    });

  entry.refreshPromise = refreshPromise;
  return refreshPromise;
}

async function getCached(key, fetchFn) {
  const entry = getOrCreateEntry(key);

  if (!hasData(entry)) {
    await refreshKey(key, fetchFn, entry, "cache-miss");
    return buildResponse(entry, { stale: false, message: null });
  }

  if (isFresh(entry)) {
    console.log(`[CACHE HIT] ${key}`);
    return buildResponse(entry, { stale: false, message: null });
  }

  console.warn(`[CACHE STALE] ${key}`);

  let message = null;
  if (entry.refreshing) {
    message = "Refreshing...";
  } else if (entry.retryTimer || entry.error) {
    // A failed refresh already scheduled retry; keep serving stale without spawning new refresh storms.
    message = "Cache not refreshing. Retrying...";
  } else {
    refreshKey(key, fetchFn, entry, "stale-read").catch(() => {
      // Serve stale data while retry loop continues.
    });
    message = "Refreshing...";
  }

  return buildResponse(entry, { stale: true, message });
}

function clearCached(key) {
  if (!cacheStore.has(key)) {
    return false;
  }

  const entry = cacheStore.get(key);
  clearRetryTimer(entry);
  cacheStore.delete(key);
  return true;
}

module.exports = {
  CACHE_TTL_MS,
  REFRESH_RETRY_MS,
  getCached,
  clearCached,
  _cacheStore: cacheStore
};
