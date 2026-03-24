const express = require("express");

const { getCached } = require("../cache");
const { fetchIntradaySeriesFromNse } = require("../services/nseService");
const { buildIntradaySeries } = require("../services/intradaySeries");

const router = express.Router();

const INTRADAY_CONFIG = {
  energy: {
    key: "intraday:energy",
    indexName: "NIFTY ENERGY",
    seedPrice: 24500
  },
  oilGas: {
    key: "intraday:oilGas",
    indexName: "NIFTY OIL & GAS",
    seedPrice: 11230
  },
  realEstate: {
    key: "intraday:realEstate",
    indexName: "NIFTY REALTY",
    seedPrice: 3800
  }
};

async function fetchIntradayPayload({ indexName, seedPrice }) {
  const live = await fetchIntradaySeriesFromNse(indexName);
  if (live) {
    return {
      ...live,
      source: "nse-live",
      fetchedAt: new Date().toISOString()
    };
  }

  return {
    ...buildIntradaySeries(null, { seedPrice }),
    source: "synthetic-fallback",
    fetchedAt: new Date().toISOString()
  };
}

function cachedIntradayHandler(config) {
  return async (_req, res, next) => {
    try {
      const response = await getCached(config.key, () => fetchIntradayPayload(config));
      return res.json(response);
    } catch (error) {
      return next(error);
    }
  };
}

router.get("/energy-sector/intraday", cachedIntradayHandler(INTRADAY_CONFIG.energy));
router.get("/oil-gas/intraday", cachedIntradayHandler(INTRADAY_CONFIG.oilGas));
router.get("/real-estate-sector/intraday", cachedIntradayHandler(INTRADAY_CONFIG.realEstate));

module.exports = router;

