const fs = require("fs");
const path = require("path");
const NodeCache = require("node-cache");

const CACHE_KEY = "energy-sector-snapshot";
const CACHE_TTL_SECONDS = Math.max(Number(process.env.ENERGY_SECTOR_CACHE_TTL_SEC) || 20, 10);
const SNAPSHOT_PATH = path.join(__dirname, "..", "data", "energySectorSnapshot.json");

const cache = new NodeCache({
  stdTTL: CACHE_TTL_SECONDS,
  checkperiod: Math.max(Math.floor(CACHE_TTL_SECONDS / 2), 5),
  useClones: false
});

let lastSuccessfulSnapshot = null;
let lastSuccessfulAt = 0;
let lastRefreshError = null;
let bundledSnapshot = null;

function loadBundledSnapshot() {
  if (bundledSnapshot) {
    return bundledSnapshot;
  }

  try {
    bundledSnapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    return bundledSnapshot;
  } catch (error) {
    console.warn("Unable to load bundled energy sector snapshot:", error?.message || error);
    return null;
  }
}

function setEnergySectorCache(snapshot) {
  lastSuccessfulSnapshot = snapshot;
  lastSuccessfulAt = Date.now();
  lastRefreshError = null;
  cache.set(CACHE_KEY, snapshot);
  return snapshot;
}

function setEnergySectorRefreshError(error) {
  lastRefreshError = {
    code: error?.code || error?.statusCode || "UNKNOWN",
    message: error?.message || "Unknown refresh error",
    recordedAt: new Date().toISOString()
  };
}

function getFreshEnergySectorCache() {
  const snapshot = cache.get(CACHE_KEY);
  if (!snapshot) {
    return null;
  }

  return {
    data: snapshot,
    ageMs: Math.max(0, Date.now() - lastSuccessfulAt)
  };
}

function getLastSuccessfulEnergySectorSnapshot() {
  if (!lastSuccessfulSnapshot) {
    return null;
  }

  return {
    data: lastSuccessfulSnapshot,
    ageMs: Math.max(0, Date.now() - lastSuccessfulAt),
    error: lastRefreshError
  };
}

function getBundledEnergySectorSnapshot() {
  return loadBundledSnapshot();
}

module.exports = {
  getBundledEnergySectorSnapshot,
  getFreshEnergySectorCache,
  getLastSuccessfulEnergySectorSnapshot,
  setEnergySectorCache,
  setEnergySectorRefreshError
};
