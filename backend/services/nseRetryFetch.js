const NSE_TIMEOUT_MS = Math.max(Number(process.env.NSE_FETCH_TIMEOUT_MS) || 30000, 1000);
const NSE_MAX_RETRIES = Math.max(Number(process.env.NSE_FETCH_RETRIES) || 3, 1);
const NSE_RETRY_BASE_DELAY_MS = Math.max(Number(process.env.NSE_FETCH_RETRY_BASE_DELAY_MS) || 1000, 100);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
}

function exponentialBackoff(attempt) {
  return NSE_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1));
}

function isRateLimited(error) {
  return (
    Number(error?.statusCode) === 429 ||
    String(error?.code || "").toUpperCase().includes("RATE_LIMIT") ||
    String(error?.message || "").toLowerCase().includes("rate limit")
  );
}

async function retryNseFetch({ sector, execute, label = "snapshot" }) {
  let lastError = null;

  for (let attempt = 1; attempt <= NSE_MAX_RETRIES; attempt += 1) {
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

      if (attempt < NSE_MAX_RETRIES) {
        console.warn(`[NSE RETRY] attempt ${attempt}/${NSE_MAX_RETRIES} ${sector}`);
        const baseDelayMs = exponentialBackoff(attempt);
        const rateLimitMultiplier = isRateLimited(error) ? 3 : 1;
        const jitterMs = Math.floor(Math.random() * 250);
        await delay(baseDelayMs * rateLimitMultiplier + jitterMs);
      }
    }
  }

  return {
    ok: false,
    data: null,
    error: lastError,
    attempts: NSE_MAX_RETRIES
  };
}

module.exports = {
  retryNseFetch,
  withTimeout
};
