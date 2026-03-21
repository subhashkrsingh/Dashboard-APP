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

const NSE_FETCH_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.NSE_FETCH_TIMEOUT_MS) || 12000, 10000),
  15000
);
const NSE_FETCH_RETRIES = Math.max(Number(process.env.NSE_FETCH_RETRIES) || 2, 0);
const NSE_FETCH_RETRY_BASE_DELAY_MS = Math.max(Number(process.env.NSE_FETCH_RETRY_BASE_DELAY_MS) || 500, 100);

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new NseServiceError(timeoutMessage, 503, "NSE_TIMEOUT")), timeoutMs)
    )
  ]);
}

function isRetryableNseError(error) {
  if (error instanceof NseServiceError) {
    return (
      error.statusCode >= 500 ||
      error.code === "NSE_TIMEOUT" ||
      error.code === "NSE_NETWORK_ERROR" ||
      error.code === "NSE_UPSTREAM_ERROR" ||
      error.code === "NSE_RATE_LIMIT" ||
      error.code === "NSE_SESSION_REJECTED"
    );
  }

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("socket") ||
    message.includes("network") ||
    message.includes("econn") ||
    message.includes("etimedout")
  );
}

async function fetchWithRetry(fetcher, sector, mode) {
  let lastError = null;

  for (let attempt = 1; attempt <= NSE_FETCH_RETRIES + 1; attempt += 1) {
    try {
      return await withTimeout(
        Promise.resolve().then(() => fetcher()),
        NSE_FETCH_TIMEOUT_MS,
        `NSE ${mode} fetch timed out for ${sector} after ${NSE_FETCH_TIMEOUT_MS}ms`
      );
    } catch (error) {
      lastError = error;
      if (attempt > NSE_FETCH_RETRIES + 1 || !isRetryableNseError(error)) {
        break;
      }

      if (attempt <= NSE_FETCH_RETRIES) {
        const backoffMs = NSE_FETCH_RETRY_BASE_DELAY_MS * attempt;
        console.warn(
          `[NSE RETRY] ${mode} fetch failed for ${sector} (attempt ${attempt}/${NSE_FETCH_RETRIES + 1}):`,
          error?.message || error
        );
        await sleep(backoffMs);
      }
    }
  }

  throw lastError;
}

/**
 * Fetch normalized sector snapshot for cache population.
 */
async function fetchSectorData(sector) {
  const { fetcher } = resolveSectorConfig(sector);

  try {
    return await fetchWithRetry(fetcher, sector, "snapshot");
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
    return await fetchWithRetry(
      () => fetchIntradaySeriesForIndex(endpoint.indexName),
      sector,
      "intraday"
    );
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
