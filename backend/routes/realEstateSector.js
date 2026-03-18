const { refreshRealEstateSectorCache } = require("../services/realEstateSectorRefresher");
const {
  getBundledRealEstateSectorSnapshot,
  getFreshRealEstateSectorCache,
  getLastSuccessfulRealEstateSectorSnapshot
} = require("../services/realEstateSectorStore");
const { createSectorRouter } = require("./createSectorRouter");

const MIN_REAL_ESTATE_COMPANIES = 6;

function hasExpectedUniverse(snapshot) {
  return Array.isArray(snapshot?.companies) && snapshot.companies.length >= MIN_REAL_ESTATE_COMPANIES;
}

module.exports = createSectorRouter({
  staleWarning: "Live NSE refresh is delayed. Showing cached real estate market data.",
  snapshotWarning: "Live NSE refresh is unavailable. Showing bundled real estate snapshot.",
  refreshCache: refreshRealEstateSectorCache,
  getBundledSnapshot: getBundledRealEstateSectorSnapshot,
  getFreshCache: getFreshRealEstateSectorCache,
  getLastSuccessfulSnapshot: getLastSuccessfulRealEstateSectorSnapshot,
  validateSnapshot: hasExpectedUniverse,
  intradaySeedPrice: 3800
});
