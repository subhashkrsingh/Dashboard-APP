const DEFAULT_REFRESH_INTERVAL_MS = Math.max(Number(process.env.CACHE_REFRESH_INTERVAL_MS) || 60 * 1000, 1000);

const timers = new Map();

function startRefreshScheduler({ cacheService, sectors, intervalMs = DEFAULT_REFRESH_INTERVAL_MS }) {
  for (const sector of sectors) {
    if (timers.has(sector)) {
      continue;
    }

    const timer = setInterval(() => {
      cacheService.refreshSectorInBackground(sector, { reason: "interval" }).catch(() => {
        // Refresh errors are handled inside cacheService.
      });
    }, intervalMs);

    if (typeof timer.unref === "function") {
      timer.unref();
    }

    timers.set(sector, timer);
  }
}

function stopRefreshScheduler() {
  for (const timer of timers.values()) {
    clearInterval(timer);
  }
  timers.clear();
}

function getSchedulerStatus() {
  return {
    runningSectors: [...timers.keys()],
    intervalMs: DEFAULT_REFRESH_INTERVAL_MS
  };
}

module.exports = {
  startRefreshScheduler,
  stopRefreshScheduler,
  getSchedulerStatus,
  DEFAULT_REFRESH_INTERVAL_MS
};
