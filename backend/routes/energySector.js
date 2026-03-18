const { refreshEnergySectorCache } = require("../services/energySectorRefresher");
const {
  getBundledEnergySectorSnapshot,
  getFreshEnergySectorCache,
  getLastSuccessfulEnergySectorSnapshot
} = require("../services/energySectorStore");
const { createSectorRouter } = require("./createSectorRouter");

module.exports = createSectorRouter({
  staleWarning: "Live NSE refresh is delayed. Showing cached energy sector market data.",
  snapshotWarning: "Live NSE refresh is unavailable. Showing bundled energy sector snapshot.",
  refreshCache: refreshEnergySectorCache,
  getBundledSnapshot: getBundledEnergySectorSnapshot,
  getFreshCache: getFreshEnergySectorCache,
  getLastSuccessfulSnapshot: getLastSuccessfulEnergySectorSnapshot,
  intradaySeedPrice: 24500,
  intradayIndexName: "NIFTY ENERGY"
});
