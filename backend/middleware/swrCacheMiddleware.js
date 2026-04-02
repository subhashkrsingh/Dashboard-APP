const cacheService = require("../services/swrCacheService");

function createSWRCacheMiddleware({ sector, type }) {
  return async (req, res) => {
    const preferLiveQuery = String(req.query?.live || "").trim().toLowerCase();
    const preferLiveHeader = String(req.header("x-live-priority") || "")
      .trim()
      .toLowerCase();
    const preferLive =
      ["1", "true", "yes", "live"].includes(preferLiveQuery) ||
      ["1", "true", "yes", "live"].includes(preferLiveHeader);

    const result =
      type === "intraday"
        ? await cacheService.getIntraday(sector, { preferLive })
        : await cacheService.getSnapshotWithOptions(sector, { preferLive });

    res.set("X-Cache", result.cacheHeader);

    return res.status(200).json({
      data: result.data,
      cached: result.cached,
      stale: result.stale,
      timestamp: result.timestamp,
      _cache: result.cache
    });
  };
}

module.exports = {
  createSWRCacheMiddleware
};
