const DEFAULT_REFRESH_INTERVAL_MS = Math.max(Number(process.env.CACHE_REFRESH_INTERVAL_MS) || 60 * 1000, 1000);

const loops = new Map();

function startSectorLoop({ cacheService, sector, intervalMs }) {
  if (loops.has(sector)) {
    return;
  }

  const state = {
    stopped: false,
    timeoutId: null,
    intervalMs
  };

  const scheduleNext = () => {
    if (state.stopped) {
      return;
    }

    state.timeoutId = setTimeout(async () => {
      if (state.stopped) {
        return;
      }

      await cacheService.refreshSectorInBackground(sector, { reason: "interval" }).catch(() => {
        // Refresh errors are tracked in cacheService and stale data is preserved.
      });

      scheduleNext();
    }, state.intervalMs);

    if (typeof state.timeoutId.unref === "function") {
      state.timeoutId.unref();
    }
  };

  loops.set(sector, state);
  scheduleNext();
}

function startRefreshScheduler({ cacheService, sectors, intervalMs = DEFAULT_REFRESH_INTERVAL_MS }) {
  for (const sector of sectors) {
    startSectorLoop({ cacheService, sector, intervalMs });
  }
}

function stopRefreshScheduler() {
  for (const state of loops.values()) {
    state.stopped = true;
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
  }

  loops.clear();
}

function getSchedulerStatus() {
  return {
    runningSectors: [...loops.keys()],
    intervalMs: DEFAULT_REFRESH_INTERVAL_MS
  };
}

module.exports = {
  startRefreshScheduler,
  stopRefreshScheduler,
  getSchedulerStatus,
  DEFAULT_REFRESH_INTERVAL_MS
};
