const { getRealEstateSectorData } = require("./nseService");
const {
  setRealEstateSectorCache,
  setRealEstateSectorRefreshError
} = require("./realEstateSectorStore");

const REFRESH_INTERVAL_MS = Math.max(Number(process.env.REAL_ESTATE_REFRESH_MS) || 15000, 5000);
const RETRY_COUNT = Math.max(Number(process.env.REAL_ESTATE_REFRESH_RETRIES) || 3, 1);

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

async function refreshRealEstateSectorCache({ reason = "scheduled" } = {}) {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const snapshot = await fetchWithRetry(() => getRealEstateSectorData());
      setRealEstateSectorCache(snapshot);
      console.log(`[real-estate-sector] cache updated (${reason})`);
      return snapshot;
    } catch (error) {
      setRealEstateSectorRefreshError(error);
      console.warn(`[real-estate-sector] refresh failed (${reason}): ${error?.message || error}`);
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function startRealEstateSectorRefresher() {
  if (refreshTimer) {
    return refreshTimer;
  }

  refreshRealEstateSectorCache({ reason: "startup" }).catch(() => {
    // The route layer handles stale and snapshot fallback if warm-up misses.
  });

  refreshTimer = setInterval(() => {
    refreshRealEstateSectorCache({ reason: "interval" }).catch(() => {
      // Keep the loop alive even if NSE blocks periodically.
    });
  }, REFRESH_INTERVAL_MS);

  if (typeof refreshTimer.unref === "function") {
    refreshTimer.unref();
  }

  return refreshTimer;
}

module.exports = {
  refreshRealEstateSectorCache,
  startRealEstateSectorRefresher
};
