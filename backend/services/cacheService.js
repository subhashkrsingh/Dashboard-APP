/**
 * Production-Ready In-Memory Cache Service
 *
 * Mimics Redis-style caching with TTL, stale-while-revalidate, and background refresh.
 * Designed for high-performance API responses with resilient fallback behavior.
 */

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 2 * 60 * 1000; // 2 minutes default
const CACHE_STALE_WHILE_REVALIDATE_MS = Number(process.env.CACHE_STALE_WHILE_REVALIDATE_MS) || 5 * 60 * 1000; // 5 minutes
const MAX_REFRESH_AGE_MS = Number(process.env.MAX_REFRESH_AGE_MS) || 10 * 60 * 1000; // 10 minutes max age

/**
 * Cache Entry Structure:
 * {
 *   data: any,                    // The cached data
 *   lastUpdated: Date,           // When data was last successfully updated
 *   expiry: Date,                // When cache expires (TTL)
 *   lastSuccessfulSnapshot: any, // Last known good data for fallback
 *   isRefreshing: boolean,       // Lock to prevent duplicate refresh calls
 *   refreshPromise: Promise,     // Current refresh operation (if any)
 *   lastRefreshAttempt: Date,    // When last refresh was attempted
 *   refreshCount: number,        // Total refresh attempts
 *   errorCount: number,          // Consecutive errors
 *   lastError: string           // Last error message
 * }
 */
const cache = new Map();

/**
 * Logging utility for cache operations
 */
const logger = {
  hit: (key) => console.log(`[CACHE] HIT for ${key}`),
  miss: (key) => console.log(`[CACHE] MISS for ${key}`),
  stale: (key) => console.log(`[CACHE] STALE for ${key}`),
  refresh: {
    start: (key) => console.log(`[CACHE] REFRESH START for ${key}`),
    success: (key, duration) => console.log(`[CACHE] REFRESH SUCCESS for ${key} (${duration}ms)`),
    error: (key, error, duration) => console.log(`[CACHE] REFRESH ERROR for ${key}: ${error} (${duration}ms)`)
  }
};

/**
 * Initialize cache entry for a key
 */
function initializeCacheEntry(key) {
  if (!cache.has(key)) {
    cache.set(key, {
      data: null,
      lastUpdated: null,
      expiry: new Date(0), // Expired by default
      lastSuccessfulSnapshot: null,
      isRefreshing: false,
      refreshPromise: null,
      lastRefreshAttempt: null,
      refreshCount: 0,
      errorCount: 0,
      lastError: null
    });
  }
  return cache.get(key);
}

/**
 * Check if cache entry is fresh (not expired)
 */
function isFresh(entry) {
  return entry.data && entry.lastUpdated && new Date() < entry.expiry;
}

/**
 * Check if cache entry is stale but still usable (stale-while-revalidate)
 */
function isStaleButUsable(entry) {
  if (!entry.lastSuccessfulSnapshot) return false;
  const now = new Date();
  const staleExpiry = new Date(entry.lastUpdated.getTime() + CACHE_STALE_WHILE_REVALIDATE_MS);
  return now > entry.expiry && now < staleExpiry;
}

/**
 * Get cache entry with metadata
 */
function getCacheEntry(key) {
  const entry = initializeCacheEntry(key);

  if (isFresh(entry)) {
    logger.hit(key);
    return {
      data: entry.data,
      status: 'fresh',
      ageMs: Date.now() - entry.lastUpdated.getTime(),
      lastUpdated: entry.lastUpdated
    };
  }

  if (isStaleButUsable(entry)) {
    logger.stale(key);
    // Trigger background refresh
    const refreshPromise = triggerBackgroundRefresh(key);
    if (refreshPromise?.catch) {
      refreshPromise.catch(() => {
        // Background refresh errors are already tracked in cache metadata.
      });
    }
    return {
      data: entry.lastSuccessfulSnapshot,
      status: 'stale',
      ageMs: Date.now() - entry.lastUpdated.getTime(),
      lastUpdated: entry.lastUpdated,
      warning: 'Data may be stale, refresh in progress'
    };
  }

  logger.miss(key);
  // Trigger background refresh
  const refreshPromise = triggerBackgroundRefresh(key);
  if (refreshPromise?.catch) {
    refreshPromise.catch(() => {
      // Background refresh errors are already tracked in cache metadata.
    });
  }
  return {
    data: entry.lastSuccessfulSnapshot,
    status: 'miss',
    ageMs: entry.lastUpdated ? Date.now() - entry.lastUpdated.getTime() : null,
    lastUpdated: entry.lastUpdated,
    warning: 'No cached data available, refresh in progress'
  };
}

/**
 * Set cache data (called after successful refresh)
 */
function setCacheData(key, data) {
  const entry = initializeCacheEntry(key);
  const now = new Date();

  entry.data = data;
  entry.lastUpdated = now;
  entry.expiry = new Date(now.getTime() + CACHE_TTL_MS);
  entry.lastSuccessfulSnapshot = data; // Update fallback
  entry.errorCount = 0; // Reset error count on success
  entry.lastError = null;
}

/**
 * Update cache with refresh error
 */
function setCacheError(key, error) {
  const entry = initializeCacheEntry(key);
  entry.errorCount += 1;
  entry.lastError = error.message || String(error);
  // Don't update data or lastSuccessfulSnapshot on error
}

/**
 * Trigger background refresh (non-blocking)
 */
function triggerBackgroundRefresh(key) {
  const entry = initializeCacheEntry(key);

  // Prevent duplicate refreshes
  if (entry.isRefreshing || entry.refreshPromise) {
    return entry.refreshPromise;
  }

  // Rate limiting: don't refresh too frequently
  if (entry.lastRefreshAttempt) {
    const timeSinceLastRefresh = Date.now() - entry.lastRefreshAttempt.getTime();
    if (timeSinceLastRefresh < 10000) { // 10 second minimum between refreshes
      return null;
    }
  }

  entry.isRefreshing = true;
  entry.lastRefreshAttempt = new Date();
  entry.refreshCount += 1;

  logger.refresh.start(key);

  // Import fetchService dynamically to avoid circular dependencies
  const fetchService = require('./fetchService');

  const refreshPromise = fetchService.fetchSectorData(key)
    .then(data => {
      const duration = Date.now() - entry.lastRefreshAttempt.getTime();
      logger.refresh.success(key, duration);
      setCacheData(key, data);
      return data;
    })
    .catch(error => {
      const duration = Date.now() - entry.lastRefreshAttempt.getTime();
      logger.refresh.error(key, error.message, duration);
      setCacheError(key, error);
      throw error;
    })
    .finally(() => {
      entry.isRefreshing = false;
      entry.refreshPromise = null;
    });

  entry.refreshPromise = refreshPromise;
  return refreshPromise;
}

/**
 * Manual refresh (for admin endpoints)
 */
function refreshCache(key) {
  return triggerBackgroundRefresh(key);
}

/**
 * Get cache statistics for health endpoint
 */
function getCacheStats() {
  const stats = {};
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    stats[key] = {
      isFresh: isFresh(entry),
      isStaleButUsable: isStaleButUsable(entry),
      ageMs: entry.lastUpdated ? now - entry.lastUpdated.getTime() : null,
      lastUpdated: entry.lastUpdated,
      expiry: entry.expiry,
      isRefreshing: entry.isRefreshing,
      refreshCount: entry.refreshCount,
      errorCount: entry.errorCount,
      lastError: entry.lastError,
      hasSnapshot: !!entry.lastSuccessfulSnapshot
    };
  }

  return stats;
}

/**
 * Clear cache (for testing/admin)
 */
function clearCache(key = null) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Get cache size
 */
function getCacheSize() {
  return cache.size;
}

module.exports = {
  getCacheEntry,
  setCacheData,
  triggerBackgroundRefresh,
  refreshCache,
  getCacheStats,
  clearCache,
  getCacheSize,
  CACHE_TTL_MS,
  CACHE_STALE_WHILE_REVALIDATE_MS
};
