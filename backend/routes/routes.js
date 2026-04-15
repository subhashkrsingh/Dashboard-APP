const express = require("express");
const cacheService = require("../services/swrCacheService");
const { createSWRCacheMiddleware } = require("../middleware/swrCacheMiddleware");
const { buildErrorEnvelope, buildSuccessEnvelope } = require("../utils/sectorApiEnvelope");

function createSectorRouter(sector) {
  const router = express.Router();

  router.get("/", createSWRCacheMiddleware({ sector, type: "snapshot" }));

  const intradayHandler = createSWRCacheMiddleware({ sector, type: "intraday" });
  router.get("/intraday", intradayHandler);
  router.get("/intrada", intradayHandler);

  router.post("/refresh", async (_req, res) => {
    try {
      const result = await cacheService.forceRefreshSnapshot(sector);
      res.set("X-Cache", result.cacheHeader);

      return res.status(200).json(buildSuccessEnvelope(result));
    } catch (error) {
      return res.status(503).json(
        buildErrorEnvelope({
          error: "REFRESH_FAILED",
          message: "Unable to refresh market data right now."
        })
      );
    }
  });

  // Never allow sector-router 404s; always return valid JSON.
  router.use((req, res) => {
    return res.status(400).json(
      buildErrorEnvelope({
        error: "INVALID_SECTOR_ROUTE",
        message: "Valid sector routes: /, /intraday, /intrada, /refresh",
        details: {
          sector,
          path: req.originalUrl
        }
      })
    );
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
