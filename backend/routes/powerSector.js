const express = require("express");
const NodeCache = require("node-cache");

const { getPowerSectorData, NseServiceError } = require("../services/nseService");

const router = express.Router();
const responseCache = new NodeCache({
  stdTTL: 10,
  checkperiod: 5,
  useClones: false
});

let lastSuccessfulSnapshot = null;

router.get("/", async (req, res, next) => {
  const cacheKey = "power-sector-snapshot";
  const cached = responseCache.get(cacheKey);
  if (cached) {
    res.set("X-Cache", "HIT");
    return res.json({ ...cached, cached: true, stale: false });
  }

  try {
    const snapshot = await getPowerSectorData();
    responseCache.set(cacheKey, snapshot);
    lastSuccessfulSnapshot = snapshot;
    res.set("X-Cache", "MISS");
    return res.json({ ...snapshot, cached: false, stale: false });
  } catch (error) {
    if (lastSuccessfulSnapshot) {
      res.set("X-Cache", "STALE");
      return res.status(200).json({
        ...lastSuccessfulSnapshot,
        cached: false,
        stale: true,
        warning: error?.message || "Serving stale data due to upstream error."
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
