const express = require("express");

const { NseServiceError } = require("../services/nseService");
const { refreshRealEstateSectorCache } = require("../services/realEstateSectorRefresher");
const {
  getBundledRealEstateSectorSnapshot,
  getFreshRealEstateSectorCache,
  getLastSuccessfulRealEstateSectorSnapshot
} = require("../services/realEstateSectorStore");

const router = express.Router();

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

router.get("/", async (req, res, next) => {
  const cached = getFreshRealEstateSectorCache();
  if (cached) {
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
    const snapshot = await refreshRealEstateSectorCache({ reason: "request-miss" });
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
    const stale = getLastSuccessfulRealEstateSectorSnapshot();
    if (stale) {
      res.set("X-Cache", "STALE");
      return res.status(200).json({
        ...toRouteSnapshot(stale.data, {
          cacheAgeMs: stale.ageMs,
          cached: true,
          stale: true,
          snapshot: false,
          dataStatus: "stale",
          warning: error?.message || "Serving stale data due to upstream error."
        }),
        lastRefreshError: stale.error
      });
    }

    const fallback = getBundledRealEstateSectorSnapshot();
    if (fallback) {
      res.set("X-Cache", "SNAPSHOT");
      return res.status(200).json({
        ...toRouteSnapshot(fallback, {
          cacheAgeMs: undefined,
          cached: true,
          stale: true,
          snapshot: true,
          dataStatus: "snapshot",
          warning:
            error?.message
              ? `${error.message} Showing bundled fallback snapshot.`
              : "Showing bundled fallback snapshot while live market data is unavailable."
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

module.exports = router;
