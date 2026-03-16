const express = require("express");

const { NseServiceError } = require("../services/nseService");
const { refreshEnergySectorCache } = require("../services/energySectorRefresher");
const {
  getBundledEnergySectorSnapshot,
  getFreshEnergySectorCache,
  getLastSuccessfulEnergySectorSnapshot
} = require("../services/energySectorStore");

const router = express.Router();

function getStaleWarning() {
  return "Live NSE refresh is delayed. Showing cached energy sector market data.";
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

router.get("/", async (req, res, next) => {
  const cached = getFreshEnergySectorCache();
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
    const snapshot = await refreshEnergySectorCache({ reason: "request-miss" });
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
    const stale = getLastSuccessfulEnergySectorSnapshot();
    if (stale) {
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

    const fallback = getBundledEnergySectorSnapshot();
    if (fallback) {
      res.set("X-Cache", "SNAPSHOT");
      return res.status(200).json({
        ...toRouteSnapshot(fallback, {
          cacheAgeMs: undefined,
          cached: true,
          stale: true,
          snapshot: true,
          dataStatus: "snapshot",
          warning: "Live NSE refresh is unavailable. Showing bundled energy sector snapshot."
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

router.get("/intraday", async (req, res) => {
  // Generate sample intraday data for Energy sector
  // In production, this would fetch real intraday data from NSE
  const times = ["09:15", "09:30", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
  const values = [24500, 24400, 24550, 24480, 24520, 24490, 24580, 24600];

  res.json({
    time: times,
    value: values
  });
});

module.exports = router;
