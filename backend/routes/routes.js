const express = require("express");
const cacheService = require("../services/cacheService");
const { buildIntradaySeries } = require("../services/intradaySeries");

function withMetadata(payload, cacheEntry) {
  return {
    ...payload,
    dataStatus: cacheEntry.status,
    lastUpdated: cacheEntry.lastUpdated,
    refreshError: cacheEntry.error,
    _cache: {
      status: cacheEntry.status,
      lastUpdated: cacheEntry.lastUpdated,
      refreshError: cacheEntry.error,
      isRefreshing: cacheEntry.isRefreshing
    }
  };
}

function warmingUpResponse(res, sector, cacheEntry) {
  return res.status(503).json({
    error: "CACHE_WARMING_UP",
    message: "Cache is warming up. Please retry shortly.",
    sector,
    dataStatus: "stale",
    lastUpdated: cacheEntry?.lastUpdated || null,
    refreshError: cacheEntry?.error || null
  });
}

function createSectorRouter(sector) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const cacheEntry = cacheService.getSectorState(sector, { triggerRefresh: true, reason: "route-snapshot" });

    if (!cacheEntry.hasData) {
      return warmingUpResponse(res, sector, cacheEntry);
    }

    res.set("X-Cache-Status", cacheEntry.status.toUpperCase());
    return res.json(withMetadata(cacheEntry.data, cacheEntry));
  });

  const intradayHandler = (req, res) => {
    const cacheEntry = cacheService.getSectorState(sector, { triggerRefresh: true, reason: "route-intraday" });

    if (!cacheEntry.hasData) {
      return warmingUpResponse(res, sector, cacheEntry);
    }

    const intraday = buildIntradaySeries(cacheEntry.data);
    res.set("X-Cache-Status", cacheEntry.status.toUpperCase());
    return res.json(withMetadata(intraday, cacheEntry));
  };

  router.get("/intraday", intradayHandler);
  router.get("/intrada", intradayHandler);

  router.post("/refresh", (req, res) => {
    cacheService.refreshSectorInBackground(sector, { reason: "manual-refresh", force: true }).catch(() => {
      // Error is reflected in cache metadata.
    });

    return res.status(202).json({
      message: `Refresh triggered for ${sector}`,
      sector
    });
  });

  // Never allow sector-router 404s; always return valid JSON.
  router.use((req, res) => {
    return res.status(400).json({
      error: "INVALID_SECTOR_ROUTE",
      message: "Valid sector routes: /, /intraday, /intrada, /refresh",
      sector,
      path: req.originalUrl
    });
  });

  return router;
}

function createHealthRouter() {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.json({
      status: "ok",
      cache: {
        size: cacheService.getCacheSize(),
        stats: cacheService.getCacheStats()
      }
    });
  });

  return router;
}

function createAdminRouter() {
  const router = express.Router();

  router.get("/cache", (req, res) => {
    return res.json({
      cacheSize: cacheService.getCacheSize(),
      stats: cacheService.getCacheStats()
    });
  });

  router.delete("/cache/:sector", (req, res) => {
    cacheService.clearCache(req.params.sector);
    return res.json({ message: `Cache cleared for ${req.params.sector}` });
  });

  router.delete("/cache", (req, res) => {
    cacheService.clearCache();
    return res.json({ message: "All caches cleared" });
  });

  return router;
}

module.exports = {
  createSectorRouter,
  createHealthRouter,
  createAdminRouter
};
