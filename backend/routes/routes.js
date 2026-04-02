const express = require("express");
const cacheService = require("../services/swrCacheService");
const { createSWRCacheMiddleware } = require("../middleware/swrCacheMiddleware");

function createSectorRouter(sector) {
  const router = express.Router();

  router.get("/", createSWRCacheMiddleware({ sector, type: "snapshot" }));

  const intradayHandler = createSWRCacheMiddleware({ sector, type: "intraday" });
  router.get("/intraday", intradayHandler);
  router.get("/intrada", intradayHandler);

  router.post("/refresh", (req, res) => {
    cacheService.refreshSectorInBackground(sector, { type: "snapshot", reason: "manual-refresh", force: true }).catch(() => {
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

  router.get("/", (_req, res) => {
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

  router.get("/cache", (_req, res) => {
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
