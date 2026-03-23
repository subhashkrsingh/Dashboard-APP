const cacheService = require("../services/swrCacheService");

function createSWRCacheMiddleware({ sector, type }) {
  return async (_req, res) => {
    try {
      const result =
        type === "intraday"
          ? await cacheService.getIntraday(sector)
          : await cacheService.getSnapshot(sector);

      res.set("X-Cache", result.cached ? (result.stale ? "STALE" : "HIT") : "MISS");

      return res.json({
        data: result.data,
        cached: result.cached,
        stale: result.stale,
        timestamp: result.timestamp
      });
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 503;
      return res.status(statusCode).json({
        error: "UPSTREAM_FETCH_FAILED",
        message: error?.message || "Failed to fetch market data"
      });
    }
  };
}

module.exports = {
  createSWRCacheMiddleware
};
