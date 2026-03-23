const cacheService = require("../services/swrCacheService");

function createSWRCacheMiddleware({ sector, type }) {
  return async (req, res) => {
    try {
      const preferLiveQuery = String(req.query?.live || "").trim().toLowerCase();
      const preferLiveHeader = String(req.header("x-live-priority") || "")
        .trim()
        .toLowerCase();
      const preferLive = ["1", "true", "yes", "live"].includes(preferLiveQuery) ||
        ["1", "true", "yes", "live"].includes(preferLiveHeader);

      const result =
        type === "intraday"
          ? await cacheService.getIntraday(sector, { preferLive })
          : await cacheService.getSnapshotWithOptions(sector, { preferLive });

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
