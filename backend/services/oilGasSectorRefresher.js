const { getOilGasSectorData } = require("./nseService");
const { setOilGasSectorCache, setOilGasSectorRefreshError } = require("./oilGasSectorStore");

const REFRESH_INTERVAL_MS = Math.max(Number(process.env.OIL_GAS_SECTOR_REFRESH_MS) || 15000, 5000);
const RETRY_COUNT = Math.max(Number(process.env.OIL_GAS_SECTOR_REFRESH_RETRIES) || 3, 1);

let refreshTimer = null;
let refreshInFlight = null;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(task, retries = RETRY_COUNT) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await wait(Math.min(400 * attempt, 1500));
      }
    }
  }

  throw lastError;
}

async function refreshOilGasSectorCache({ reason = "scheduled" } = {}) {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const snapshot = await fetchWithRetry(() => getOilGasSectorData());
      setOilGasSectorCache(snapshot);
      console.log(`[oil-gas-sector] cache updated (${reason})`);
      return snapshot;
    } catch (error) {
      setOilGasSectorRefreshError(error);
      console.warn(`[oil-gas-sector] refresh failed (${reason}): ${error?.message || error}`);
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function startOilGasSectorRefresher() {
  if (refreshTimer) {
    return refreshTimer;
  }

  refreshOilGasSectorCache({ reason: "startup" }).catch(() => {
    // The route layer handles stale and snapshot fallback if warm-up misses.
  });

  refreshTimer = setInterval(() => {
    refreshOilGasSectorCache({ reason: "interval" }).catch(() => {
      // Keep the loop alive even if NSE blocks periodically.
    });
  }, REFRESH_INTERVAL_MS);

  if (typeof refreshTimer.unref === "function") {
    refreshTimer.unref();
  }

  return refreshTimer;
}

module.exports = {
  refreshOilGasSectorCache,
  startOilGasSectorRefresher
};
