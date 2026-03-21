/**
 * Production-Ready API Routes with Advanced Caching
 *
 * Uses the cacheService for Redis-like caching behavior with
 * stale-while-revalidate, background refresh, and resilient fallbacks.
 */

const express = require("express");
const cacheService = require("../services/cacheService");
const { buildIntradaySeries } = require("../services/intradaySeries");

/**
 * Create sector router with caching
 */
function createSectorRouter(sector) {
  const router = express.Router();

  function withCacheMetadata(payload, cacheEntry) {
    return {
      ...payload,
      dataStatus: cacheEntry.dataStatus,
      lastUpdated: cacheEntry.lastUpdated,
      refreshError: cacheEntry.refreshError,
      _cache: {
        status: cacheEntry.dataStatus,
        ageMs: cacheEntry.ageMs,
        lastUpdated: cacheEntry.lastUpdated,
        refreshError: cacheEntry.refreshError,
        isRefreshing: cacheEntry.isRefreshing
      }
    };
  }

  function sendNoCacheResponse(res, routeName, cacheEntry) {
    return res.status(500).json({
      error: "CACHE_UNAVAILABLE",
      message: `No cached ${routeName} data is available yet. Refresh is running in background.`,
      sector,
      dataStatus: cacheEntry.dataStatus,
      lastUpdated: cacheEntry.lastUpdated,
      refreshError: cacheEntry.refreshError
    });
  }

  /**
   * GET /api/:sector - Main sector data endpoint
   */
  router.get("/", (req, res) => {
    const startTime = Date.now();

    try {
      const cacheEntry = cacheService.getCacheEntry(sector);

      if (!cacheEntry.data) {
        return sendNoCacheResponse(res, "sector", cacheEntry);
      }

      res.set({
        "X-Cache-Status": cacheEntry.dataStatus.toUpperCase(),
        "X-Cache-Age": String(cacheEntry.ageMs || 0),
        "X-Response-Time": String(Date.now() - startTime)
      });

      return res.json(withCacheMetadata(cacheEntry.data, cacheEntry));
    } catch (error) {
      console.error(`[API] Error in ${sector} endpoint:`, error);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message,
        sector
      });
    }
  });

  /**
   * GET /api/:sector/intraday - Intraday chart data
   */
  const intradayHandler = (req, res) => {
    const startTime = Date.now();

    try {
      const cacheEntry = cacheService.getCacheEntry(sector);

      if (!cacheEntry.data?.sectorIndex) {
        return sendNoCacheResponse(res, "intraday", cacheEntry);
      }

      const syntheticSeries = buildIntradaySeries(cacheEntry.data);

      res.set({
        "X-Cache-Status": cacheEntry.dataStatus.toUpperCase(),
        "X-Cache-Age": String(cacheEntry.ageMs || 0),
        "X-Response-Time": String(Date.now() - startTime)
      });

      return res.json(
        withCacheMetadata(
          {
            ...syntheticSeries,
            source: "synthetic-cache"
          },
          cacheEntry
        )
      );
    } catch (error) {
      console.error(`[API] Error in ${sector}/intraday endpoint:`, error);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message,
        sector
      });
    }
  };

  router.get("/intraday", intradayHandler);
  router.get("/intrada", intradayHandler);

  /**
   * POST /api/:sector/refresh - Manual refresh endpoint
   */
  router.post("/refresh", async (req, res) => {
    try {
      const refreshPromise = cacheService.refreshCache(sector, { reason: "manual-api" });

      // Don't wait for completion, return immediately
      res.json({
        message: `Refresh triggered for ${sector}`,
        sector,
        refreshStarted: true
      });

      // Log completion in background
      if (refreshPromise) {
        refreshPromise
          .then(() => console.log(`[API] Manual refresh completed for ${sector}`))
          .catch(error => console.error(`[API] Manual refresh failed for ${sector}:`, error));
      }

    } catch (error) {
      console.error(`[API] Error triggering refresh for ${sector}:`, error);
      return res.status(500).json({
        error: "Failed to trigger refresh",
        message: error.message,
        sector
      });
    }
  });

  return router;
}

/**
 * Health endpoint with cache statistics
 */
function createHealthRouter() {
  const router = express.Router();

  router.get("/", (req, res) => {
    const cacheStats = cacheService.getCacheStats();
    const uptime = Math.round(process.uptime());

    res.json({
      status: "ok",
      service: "power-sector-dashboard-api",
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: uptime,
      timestamp: new Date().toISOString(),
      cache: {
        size: cacheService.getCacheSize(),
        ttlMs: cacheService.CACHE_TTL_MS,
        staleWhileRevalidateMs: cacheService.CACHE_STALE_WHILE_REVALIDATE_MS,
        stats: cacheStats
      },
      sectors: Object.keys(cacheStats)
    });
  });

  return router;
}

/**
 * Admin routes for cache management
 */
function createAdminRouter() {
  const router = express.Router();

  // Clear specific cache
  router.delete("/cache/:sector", (req, res) => {
    const { sector } = req.params;
    cacheService.clearCache(sector);
    res.json({ message: `Cache cleared for ${sector}` });
  });

  // Clear all caches
  router.delete("/cache", (req, res) => {
    cacheService.clearCache();
    res.json({ message: "All caches cleared" });
  });

  // Get detailed cache stats
  router.get("/cache", (req, res) => {
    const stats = cacheService.getCacheStats();
    res.json({
      cacheSize: cacheService.getCacheSize(),
      stats
    });
  });

  return router;
}

module.exports = {
  createSectorRouter,
  createHealthRouter,
  createAdminRouter
};
