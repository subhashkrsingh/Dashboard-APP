const express = require("express");

const { NseServiceError, fetchIntradaySeriesFromNse } = require("../services/nseService");
const { buildIntradaySeries } = require("../services/intradaySeries");

function toRouteSnapshot(snapshot, overrides = {}) {
  return {
    ...snapshot,
    cacheAgeMs: overrides.cacheAgeMs,
    cached: overrides.cached ?? false,
    stale: overrides.stale ?? false,
    snapshot: overrides.snapshot ?? false,
    dataStatus: overrides.dataStatus ?? "live",
    warning: overrides.warning ?? snapshot.warning
  };
}

function defaultValidateSnapshot(snapshot) {
  return Boolean(snapshot);
}

function createSectorRouter({
  staleWarning,
  snapshotWarning,
  refreshCache,
  getBundledSnapshot,
  getFreshCache,
  getLastSuccessfulSnapshot,
  validateSnapshot = defaultValidateSnapshot,
  intradaySeedPrice,
  intradayIndexName
}) {
  const router = express.Router();

  router.get("/", async (_req, res, next) => {
    const cached = getFreshCache();
    if (cached && validateSnapshot(cached.data)) {
      res.set("X-Cache", "HIT");
      return res.json(
        toRouteSnapshot(cached.data, {
          cacheAgeMs: cached.ageMs,
          cached: true,
          stale: false,
          snapshot: false,
          dataStatus: "live"
        })
      );
    }

    try {
      const snapshot = await refreshCache({ reason: "request-miss" });
      res.set("X-Cache", "MISS");
      return res.json(
        toRouteSnapshot(snapshot, {
          cacheAgeMs: 0,
          cached: false,
          stale: false,
          snapshot: false,
          dataStatus: "live"
        })
      );
    } catch (error) {
      const stale = getLastSuccessfulSnapshot();
      if (stale && validateSnapshot(stale.data)) {
        res.set("X-Cache", "STALE");
        return res.status(200).json({
          ...toRouteSnapshot(stale.data, {
            cacheAgeMs: stale.ageMs,
            cached: true,
            stale: true,
            snapshot: false,
            dataStatus: "stale",
            warning: staleWarning
          }),
          lastRefreshError: stale.error
        });
      }

      const fallback = getBundledSnapshot();
      if (fallback && validateSnapshot(fallback)) {
        res.set("X-Cache", "SNAPSHOT");
        return res.status(200).json({
          ...toRouteSnapshot(fallback, {
            cacheAgeMs: undefined,
            cached: true,
            stale: true,
            snapshot: true,
            dataStatus: "snapshot",
            warning: snapshotWarning
          })
        });
      }

      if (error instanceof NseServiceError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code
        });
      }

      return next(error);
    }
  });

  router.get("/intraday", async (_req, res) => {
    const cached = getFreshCache();
    const stale = cached ? null : getLastSuccessfulSnapshot();
    const bundled = cached || stale ? null : getBundledSnapshot();
    const preferredSnapshot = cached?.data ?? stale?.data ?? bundled ?? null;

    if (intradayIndexName) {
      try {
        const series = await fetchIntradaySeriesFromNse(intradayIndexName);
        res.set("X-Cache", "LIVE");
        return res.json({
          ...series,
          source: "nse",
          fetchedAt: new Date().toISOString()
        });
      } catch (error) {
        // Fall back to synthetic series when NSE intraday is unavailable.
        console.warn(`[intraday] NSE series fetch failed for ${intradayIndexName}:`, error?.message || error);
      }
    }

    const cacheHeader = cached ? "HIT" : stale ? "STALE" : bundled ? "SNAPSHOT" : "MISS";
    res.set("X-Cache", cacheHeader);
    return res.json(buildIntradaySeries(preferredSnapshot, { seedPrice: intradaySeedPrice }));
  });

  return router;
}

module.exports = {
  createSectorRouter
};
