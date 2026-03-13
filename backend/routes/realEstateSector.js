const express = require("express");

const { NseServiceError } = require("../services/nseService");
const { refreshRealEstateSectorCache } = require("../services/realEstateSectorRefresher");
const {
  getBundledRealEstateSectorSnapshot,
  getFreshRealEstateSectorCache,
  getLastSuccessfulRealEstateSectorSnapshot
} = require("../services/realEstateSectorStore");

const router = express.Router();
const MIN_REAL_ESTATE_COMPANIES = 6;

function getStaleWarning() {
  return "Live NSE refresh is delayed. Showing cached real estate market data.";
}

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

function hasExpectedUniverse(snapshot) {
  return Array.isArray(snapshot?.companies) && snapshot.companies.length >= MIN_REAL_ESTATE_COMPANIES;
}

router.get("/", async (req, res, next) => {
  const cached = getFreshRealEstateSectorCache();
  if (cached && hasExpectedUniverse(cached.data)) {
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
    if (stale && hasExpectedUniverse(stale.data)) {
      res.set("X-Cache", "STALE");
      return res.status(200).json({
        ...toRouteSnapshot(stale.data, {
          cacheAgeMs: stale.ageMs,
          cached: true,
          stale: true,
          snapshot: false,
          dataStatus: "stale",
          warning: getStaleWarning()
        }),
        lastRefreshError: stale.error
      });
    }

    const fallback = getBundledRealEstateSectorSnapshot();
    if (fallback && hasExpectedUniverse(fallback)) {
      res.set("X-Cache", "SNAPSHOT");
      return res.status(200).json({
        ...toRouteSnapshot(fallback, {
          cacheAgeMs: undefined,
          cached: true,
          stale: true,
          snapshot: true,
          dataStatus: "snapshot",
          warning: "Live NSE refresh is unavailable. Showing bundled real estate snapshot."
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
