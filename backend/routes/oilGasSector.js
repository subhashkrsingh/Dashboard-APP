const { refreshOilGasSectorCache } = require("../services/oilGasSectorRefresher");
const {
  getBundledOilGasSectorSnapshot,
  getFreshOilGasSectorCache,
  getLastSuccessfulOilGasSectorSnapshot
} = require("../services/oilGasSectorStore");
const { createSectorRouter } = require("./createSectorRouter");

module.exports = createSectorRouter({
  staleWarning: "Live NSE refresh is delayed. Showing cached oil & gas sector market data.",
  snapshotWarning: "Live NSE refresh is unavailable. Showing bundled oil & gas sector snapshot.",
  refreshCache: refreshOilGasSectorCache,
  getBundledSnapshot: getBundledOilGasSectorSnapshot,
  getFreshCache: getFreshOilGasSectorCache,
  getLastSuccessfulSnapshot: getLastSuccessfulOilGasSectorSnapshot,
  intradaySeedPrice: 11230
});
