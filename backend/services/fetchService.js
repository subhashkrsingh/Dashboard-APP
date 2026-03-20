/**
 * Cache fetch adapter.
 *
 * This module bridges cacheService -> nseService using a stable sector map.
 * It intentionally keeps the same public API shape used by routes/cache code.
 */

const {
  getEnergySectorData,
  getOilGasSectorData,
  getRealEstateSectorData,
  fetchIntradaySeriesFromNse: fetchIntradaySeriesForIndex,
  NseServiceError
} = require("./nseService");

const NSE_ENDPOINTS = {
  energy: {
    indexName: "NIFTY ENERGY"
  },
  oilGas: {
    indexName: "NIFTY OIL & GAS"
  },
  realEstate: {
    indexName: "NIFTY REALTY"
  }
};

const SNAPSHOT_FETCHERS = {
  energy: getEnergySectorData,
  oilGas: getOilGasSectorData,
  realEstate: getRealEstateSectorData
};

function toNseError(error, message, fallbackCode = "SECTOR_FETCH_ERROR") {
  if (error instanceof NseServiceError) {
    return new NseServiceError(message, error.statusCode, error.code || fallbackCode);
  }

  return new NseServiceError(message, 503, fallbackCode);
}

function resolveSectorConfig(sector) {
  const endpoint = NSE_ENDPOINTS[sector];
  const fetcher = SNAPSHOT_FETCHERS[sector];

  if (!endpoint || !fetcher) {
    throw new NseServiceError(`Unknown sector: ${sector}`, 400, "INVALID_SECTOR");
  }

  return { endpoint, fetcher };
}

/**
 * Fetch normalized sector snapshot for cache population.
 */
async function fetchSectorData(sector) {
  const { fetcher } = resolveSectorConfig(sector);

  try {
    return await fetcher();
  } catch (error) {
    throw toNseError(
      error,
      `Failed to fetch sector snapshot for ${sector}: ${error?.message || "Unknown error"}`,
      "SECTOR_SNAPSHOT_ERROR"
    );
  }
}

/**
 * Fetch intraday series by mapped index name.
 * Returns null on upstream failure so callers can generate synthetic fallback.
 */
async function fetchIntradaySeriesFromNse(sector) {
  const { endpoint } = resolveSectorConfig(sector);

  try {
    return await fetchIntradaySeriesForIndex(endpoint.indexName);
  } catch (error) {
    console.warn(`[NSE] Intraday series fetch failed for ${sector}:`, error?.message || error);
    return null;
  }
}

module.exports = {
  fetchSectorData,
  fetchIntradaySeriesFromNse,
  NseServiceError,
  NSE_ENDPOINTS
};
