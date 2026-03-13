const { getPowerSectorData } = require("./nseService");
const { setPowerSectorCache, setPowerSectorRefreshError } = require("./powerSectorStore");

const REFRESH_INTERVAL_MS = Math.max(Number(process.env.POWER_SECTOR_REFRESH_MS) || 15000, 5000);
const RETRY_COUNT = Math.max(Number(process.env.POWER_SECTOR_REFRESH_RETRIES) || 3, 1);

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

async function refreshPowerSectorCache({ reason = "scheduled" } = {}) {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const snapshot = await fetchWithRetry(() => getPowerSectorData());
      setPowerSectorCache(snapshot);
      console.log(`[power-sector] cache updated (${reason})`);
      return snapshot;
    } catch (error) {
      setPowerSectorRefreshError(error);
      console.warn(`[power-sector] refresh failed (${reason}): ${error?.message || error}`);
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function startPowerSectorRefresher() {
  if (refreshTimer) {
    return refreshTimer;
  }

  refreshPowerSectorCache({ reason: "startup" }).catch(() => {
    // The route layer handles stale and snapshot fallback if warm-up misses.
  });

  refreshTimer = setInterval(() => {
    refreshPowerSectorCache({ reason: "interval" }).catch(() => {
      // Keep the loop alive even if NSE blocks periodically.
    });
  }, REFRESH_INTERVAL_MS);

  if (typeof refreshTimer.unref === "function") {
    refreshTimer.unref();
  }

  return refreshTimer;
}

module.exports = {
  refreshPowerSectorCache,
  startPowerSectorRefresher
};
