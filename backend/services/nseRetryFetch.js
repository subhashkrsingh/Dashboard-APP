const NSE_TIMEOUT_MS = Math.max(Number(process.env.NSE_FETCH_TIMEOUT_MS) || 30000, 1000);
const NSE_RETRY_DELAYS_MS = [500, 1500, 3000];
const NSE_MAX_ATTEMPTS = NSE_RETRY_DELAYS_MS.length + 1;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutHandle = null;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  });
}

async function retryNseFetch({ sector, execute, label = "snapshot" }) {
  let lastError = null;

  for (let attempt = 1; attempt <= NSE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const data = await withTimeout(
        Promise.resolve().then(() => execute()),
        NSE_TIMEOUT_MS,
        `NSE ${label} timeout for ${sector} after ${NSE_TIMEOUT_MS}ms`
      );

      return {
        ok: true,
        data,
        error: null,
        attempts: attempt
      };
    } catch (error) {
      lastError = error;

      if (attempt < NSE_MAX_ATTEMPTS) {
        const waitMs = NSE_RETRY_DELAYS_MS[attempt - 1] ?? NSE_RETRY_DELAYS_MS[NSE_RETRY_DELAYS_MS.length - 1];
        console.warn(`[NSE RETRY] attempt ${attempt}/${NSE_MAX_ATTEMPTS} ${sector} wait=${waitMs}ms`);
        await delay(waitMs);
      }
    }
  }

  return {
    ok: false,
    data: null,
    error: lastError,
    attempts: NSE_MAX_ATTEMPTS
  };
}

module.exports = {
  retryNseFetch,
  withTimeout
};
