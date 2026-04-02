/**
 * Safe NSE fetch adapter.
 *
 * This service never throws to route code. It returns { ok, data, error } for callers
 * such as cache refresh jobs.
 */

const {
  getEnergySectorData,
  getBankingSectorData,
  getAutoSectorData,
  getFmcgSectorData,
  getItSectorData,
  getOilGasSectorData,
  getRealEstateSectorData,
  NseServiceError
} = require("./nseService");
const { retryNseFetch } = require("./nseRetryFetch");

const SNAPSHOT_FETCHERS = {
  energy: getEnergySectorData,
  banking: getBankingSectorData,
  auto: getAutoSectorData,
  fmcg: getFmcgSectorData,
  it: getItSectorData,
  oilGas: getOilGasSectorData,
  realEstate: getRealEstateSectorData
};

function toNseServiceError(error, sector) {
  if (error instanceof NseServiceError) {
    return error;
  }

  return new NseServiceError(
    `Failed to fetch ${sector} sector data: ${error?.message || "Unknown error"}`,
    503,
    "SECTOR_FETCH_ERROR"
  );
}

function resolveSnapshotFetcher(sector) {
  const fetcher = SNAPSHOT_FETCHERS[sector];
  if (!fetcher) {
    throw new NseServiceError(`Unknown sector: ${sector}`, 400, "INVALID_SECTOR");
  }
  return fetcher;
}

async function fetchSectorDataSafe(sector) {
  let fetcher;

  try {
    fetcher = resolveSnapshotFetcher(sector);
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: toNseServiceError(error, sector),
      attempts: 0
    };
  }

  const result = await retryNseFetch({
    sector,
    label: "snapshot",
    execute: fetcher
  });

  if (result.ok) {
    return result;
  }

  return {
    ...result,
    error: toNseServiceError(result.error, sector)
  };
}

module.exports = {
  fetchSectorDataSafe
};
