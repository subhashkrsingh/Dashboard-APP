const NSE_TIMEOUT_MS = Math.max(Number(process.env.NSE_FETCH_TIMEOUT_MS) || 20000, 1000);
const NSE_MAX_RETRIES = Math.max(Number(process.env.NSE_FETCH_RETRIES) || 3, 1);
const NSE_RETRY_BASE_DELAY_MS = Math.max(Number(process.env.NSE_FETCH_RETRY_BASE_DELAY_MS) || 750, 100);

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
        await delay(exponentialBackoff(attempt));
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
