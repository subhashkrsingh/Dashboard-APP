/**
 * Production-Ready API Routes with Advanced Caching
 *
 * Uses the cacheService for Redis-like caching behavior with
 * stale-while-revalidate, background refresh, and resilient fallbacks.
 */

const express = require("express");
const cacheService = require("../services/cacheService");
const fetchService = require("../services/fetchService");
const { buildIntradaySeries } = require("../services/intradaySeries");

/**
 * Create sector router with caching
 */
function createSectorRouter(sector, intradayIndexName) {
  const router = express.Router();

  /**
   * GET /api/:sector - Main sector data endpoint
   */
  router.get("/", async (req, res) => {
    const startTime = Date.now();

    try {
      const cacheEntry = cacheService.getCacheEntry(sector);

      if (!cacheEntry.data) {
        // No data available at all
        return res.status(503).json({
          error: "Service temporarily unavailable",
          message: "No data available and refresh failed",
          sector,
          status: cacheEntry.status,
          warning: cacheEntry.warning
        });
      }

      // Return data with cache metadata
      const response = {
        ...cacheEntry.data,
        _cache: {
          status: cacheEntry.status,
          ageMs: cacheEntry.ageMs,
          lastUpdated: cacheEntry.lastUpdated,
          warning: cacheEntry.warning
        }
      };

      // Set cache headers
      res.set({
        'X-Cache-Status': cacheEntry.status.toUpperCase(),
        'X-Cache-Age': cacheEntry.ageMs || 0,
        'X-Response-Time': Date.now() - startTime
      });

      return res.json(response);

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
  router.get("/intraday", async (req, res) => {
    const startTime = Date.now();

    try {
      // Try to get real NSE intraday data first
      const realData = await fetchService.fetchIntradaySeriesFromNse(sector);

      if (realData && realData.time && realData.value && realData.time.length > 0) {
        // Return real NSE data
        return res.json({
          time: realData.time,
          value: realData.value,
          source: "nse-live",
          fetchedAt: new Date().toISOString(),
          _cache: {
            status: 'live',
            ageMs: 0,
            lastUpdated: new Date(),
            warning: null
          }
        });
      }

      // Fallback to synthetic data using sector snapshot
      const cacheEntry = cacheService.getCacheEntry(sector);

      if (cacheEntry.data?.sectorIndex) {
        const syntheticSeries = buildIntradaySeries(cacheEntry.data);

        return res.json({
          ...syntheticSeries,
          source: "synthetic",
          _cache: {
            status: cacheEntry.status,
            ageMs: cacheEntry.ageMs,
            lastUpdated: cacheEntry.lastUpdated,
            warning: cacheEntry.warning || "Using synthetic data (NSE intraday unavailable)"
          }
        });
      }

      // No data available
      return res.status(503).json({
        error: "Intraday data unavailable",
        message: "No sector data available for synthetic generation",
        sector
      });

    } catch (error) {
      console.error(`[API] Error in ${sector}/intraday endpoint:`, error);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message,
        sector
      });
    }
  });

  /**
   * POST /api/:sector/refresh - Manual refresh endpoint
   */
  router.post("/refresh", async (req, res) => {
    try {
      const refreshPromise = cacheService.refreshCache(sector);

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