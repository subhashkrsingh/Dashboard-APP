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
    ttl: CACHE_TTL_MS,
    refreshing: false,
    refreshPromise: null,
    retryTimer: null,
    lastRefreshFailed: false
  };

  cacheStore.set(key, nextEntry);
  return nextEntry;
}

function hasData(entry) {
  return entry.timestamp > 0;
}

function isFresh(entry, now = Date.now()) {
  return hasData(entry) && now - entry.timestamp <= entry.ttl;
}

function clearRetryTimer(entry) {
  if (!entry.retryTimer) {
    return;
  }

  clearTimeout(entry.retryTimer);
  entry.retryTimer = null;
}

function buildResponse(entry, { stale, message }) {
  return {
    data: entry.data,
    _cache: {
      stale,
      message,
      timestamp: entry.timestamp
    }
  };
}

function scheduleRetry(key, fetchFn, entry) {
  if (entry.retryTimer) {
    return;
  }

  entry.retryTimer = setTimeout(async () => {
    entry.retryTimer = null;

    try {
      await refreshKey(key, fetchFn, entry);
    } catch (error) {
      // refreshKey already logs and re-schedules retry on failure.
    }
  }, REFRESH_RETRY_MS);
}

async function refreshKey(key, fetchFn, entry = getOrCreateEntry(key)) {
  if (entry.refreshing && entry.refreshPromise) {
    return entry.refreshPromise;
  }

  clearRetryTimer(entry);
  entry.refreshing = true;
  console.log(`[REFRESH START] ${key}`);

  const refreshPromise = Promise.resolve()
    .then(() => fetchFn())
    .then(data => {
      entry.data = data;
      entry.timestamp = Date.now();
      entry.lastRefreshFailed = false;
      console.log(`[REFRESH SUCCESS] ${key}`);
      return data;
    })
    .catch(error => {
      entry.lastRefreshFailed = true;
      console.error(`[REFRESH FAILED] ${key}`, error?.message || error);
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
    await refreshKey(key, fetchFn, entry);
    return buildResponse(entry, { stale: false, message: null });
  }

  if (isFresh(entry)) {
    console.log(`[CACHE HIT] ${key}`);
    return buildResponse(entry, { stale: false, message: null });
  }

  console.warn(`[CACHE STALE] ${key}`);

  refreshKey(key, fetchFn, entry).catch(() => {
    // Serve stale data while retry loop continues.
  });

  const message = entry.refreshing
    ? "Refreshing..."
    : entry.lastRefreshFailed || entry.retryTimer
    ? "Cache not refreshing. Retrying..."
    : null;

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
  clearCached
};
