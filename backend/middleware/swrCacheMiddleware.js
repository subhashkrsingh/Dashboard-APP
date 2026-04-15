const cacheService = require("../services/swrCacheService");
const { buildSuccessEnvelope } = require("../utils/sectorApiEnvelope");

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

    return res.status(200).json(buildSuccessEnvelope(result));
  };
}

module.exports = {
  createSWRCacheMiddleware
};
