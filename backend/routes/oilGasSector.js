const express = require("express");

const { NseServiceError } = require("../services/nseService");
const { refreshOilGasSectorCache } = require("../services/oilGasSectorRefresher");
const {
  getBundledOilGasSectorSnapshot,
  getFreshOilGasSectorCache,
  getLastSuccessfulOilGasSectorSnapshot
} = require("../services/oilGasSectorStore");

const router = express.Router();

function getStaleWarning() {
  return "Live NSE refresh is delayed. Showing cached oil & gas sector market data.";
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
  const cached = getFreshOilGasSectorCache();
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
    const snapshot = await refreshOilGasSectorCache({ reason: "request-miss" });
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
    const stale = getLastSuccessfulOilGasSectorSnapshot();
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

    const fallback = getBundledOilGasSectorSnapshot();
    if (fallback) {
      res.set("X-Cache", "SNAPSHOT");
      return res.status(200).json({
        ...toRouteSnapshot(fallback, {
          cacheAgeMs: undefined,
          cached: true,
          stale: true,
          snapshot: true,
          dataStatus: "snapshot",
          warning: "Live NSE refresh is unavailable. Showing bundled oil & gas sector snapshot."
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
  // Generate sample intraday data for Oil & Gas sector
  // In production, this would fetch real intraday data from NSE
  const times = ["09:15", "09:30", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
  const values = [11230, 11110, 11180, 11090, 11050, 11010, 11100, 11140];

  res.json({
    time: times,
    value: values
  });
});

module.exports = router;
