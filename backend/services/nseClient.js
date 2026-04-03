const axios = require("axios");
const dns = require("dns");
const httpModule = require("http");
const https = require("https");

const NSE_PRIMARY_BASE_URL = "https://www.nseindia.com";
const NSE_FALLBACK_BASE_URL = "https://nseindia.com";
const NSE_REQUEST_TIMEOUT_MS = Math.max(Number(process.env.NSE_REQUEST_TIMEOUT_MS) || 8000, 1000);
const NSE_MAX_RETRIES = Math.max(Number(process.env.NSE_REQUEST_RETRIES) || 3, 1);
const NSE_BASE_RETRY_DELAY_MS = Math.max(Number(process.env.NSE_RETRY_BASE_DELAY_MS) || 400, 100);
const NSE_COOKIE_TTL_MS = 20 * 60 * 1000;

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${NSE_PRIMARY_BASE_URL}/`,
  Connection: "keep-alive",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "X-Requested-With": "XMLHttpRequest"
};

try {
  dns.setDefaultResultOrder("ipv4first");
} catch (error) {
  // No-op in runtimes that do not support result-order override.
}

class NseClientError extends Error {
  constructor(message, statusCode = 503, code = "NSE_CLIENT_ERROR", details = {}) {
    super(message);
    this.name = "NseClientError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const httpAgent = new httpModule.Agent({
  keepAlive: true
});

const httpsAgents = new Map();

function getHttpsAgent(baseUrl) {
  if (!httpsAgents.has(baseUrl)) {
    const hostname = new URL(baseUrl).hostname;
    httpsAgents.set(
      baseUrl,
      new https.Agent({
        keepAlive: true,
        servername: hostname
      })
    );
  }

  return httpsAgents.get(baseUrl);
}

const axiosInstance = axios.create({
  timeout: NSE_REQUEST_TIMEOUT_MS,
  headers: {
    ...NSE_HEADERS
  },
  httpAgent,
  validateStatus: () => true,
  maxRedirects: 5
});

const sessionState = {
  cookie: "",
  expiresAt: 0,
  baseUrl: NSE_PRIMARY_BASE_URL
};

function getBaseUrlCandidates() {
  const configured = String(process.env.NSE_BASE_URL || "").trim();
  const candidates = [configured, sessionState.baseUrl, NSE_PRIMARY_BASE_URL, NSE_FALLBACK_BASE_URL].filter(Boolean);
  return [...new Set(candidates)];
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt) {
  const baseDelay = NSE_BASE_RETRY_DELAY_MS * 2 ** Math.max(attempt - 1, 0);
  const jitter = Math.round(Math.random() * 120);
  return baseDelay + jitter;
}

function toCookieHeader(setCookieHeader) {
  if (!Array.isArray(setCookieHeader)) {
    return "";
  }

  return setCookieHeader
    .map(cookie => String(cookie).split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function getRequestHeaders(cookie, baseUrl) {
  const headers = {
    ...NSE_HEADERS,
    Referer: `${baseUrl}/`,
    Origin: baseUrl
  };

  if (cookie) {
    headers.Cookie = cookie;
  }

  return headers;
}

function toClientError(error, path, baseUrl) {
  if (error instanceof NseClientError) {
    return error;
  }

  if (error && typeof error === "object" && "response" in error) {
    const response = error.response;
    const status = Number(response?.status || 0);
    const message = String(response?.data?.message || response?.data?.msg || response?.statusText || error.message || "").trim();

    if (status === 429) {
      return new NseClientError("NSE rate limit reached. Please retry shortly.", 429, "NSE_RATE_LIMIT", {
        path,
        baseUrl
      });
    }

    if (status === 401 || status === 403) {
      return new NseClientError("NSE rejected the request session.", 503, "NSE_SESSION_REJECTED", {
        path,
        baseUrl
      });
    }

    if (status >= 500) {
      return new NseClientError("NSE service is temporarily unavailable.", 503, "NSE_UPSTREAM_ERROR", {
        path,
        baseUrl
      });
    }

    if (status === 404) {
      return new NseClientError(`NSE endpoint not found: ${path}`, 404, "NSE_ENDPOINT_NOT_FOUND", {
        path,
        baseUrl
      });
    }

    if (status > 0) {
      return new NseClientError(message || "Failed to fetch NSE data", 503, "NSE_RESPONSE_ERROR", {
        path,
        baseUrl
      });
    }
  }

  if (axios.isAxiosError(error)) {
    const status = Number(error.response?.status || 0);
    const message = String(error.response?.data?.message || error.response?.statusText || error.message || "").trim();

    if (error.code === "ECONNABORTED") {
      return new NseClientError(
        `NSE request timed out after ${NSE_REQUEST_TIMEOUT_MS}ms`,
        503,
        "NSE_TIMEOUT",
        { path, baseUrl }
      );
    }

    if (error.code === "ENOTFOUND" || /getaddrinfo ENOTFOUND/i.test(message)) {
      return new NseClientError("Unable to resolve NSE host.", 503, "NSE_DNS_LOOKUP_FAILED", { path, baseUrl });
    }

    if (error.code === "ERR_TLS_CERT_ALTNAME_INVALID" || /altnames mismatch/i.test(message)) {
      return new NseClientError("NSE certificate hostname mismatch.", 503, "NSE_CERT_MISMATCH", {
        path,
        baseUrl
      });
    }

    if (status === 429) {
      return new NseClientError("NSE rate limit reached. Please retry shortly.", 429, "NSE_RATE_LIMIT", {
        path,
        baseUrl
      });
    }

    if (status === 401 || status === 403) {
      return new NseClientError("NSE rejected the request session.", 503, "NSE_SESSION_REJECTED", {
        path,
        baseUrl
      });
    }

    if (status >= 500) {
      return new NseClientError("NSE service is temporarily unavailable.", 503, "NSE_UPSTREAM_ERROR", {
        path,
        baseUrl
      });
    }

    if (status === 404) {
      return new NseClientError(`NSE endpoint not found: ${path}`, 404, "NSE_ENDPOINT_NOT_FOUND", {
        path,
        baseUrl
      });
    }

    if (status > 0) {
      return new NseClientError(message || "Failed to fetch NSE data", 503, "NSE_RESPONSE_ERROR", {
        path,
        baseUrl
      });
    }
  }

  return new NseClientError(error?.message || "Failed to fetch NSE data", 503, "NSE_REQUEST_FAILED", {
    path,
    baseUrl
  });
}

function shouldRotateBaseUrl(error) {
  return [
    "NSE_DNS_LOOKUP_FAILED",
    "NSE_CERT_MISMATCH",
    "NSE_TIMEOUT",
    "NSE_REQUEST_FAILED",
    "NSE_SESSION_REJECTED"
  ].includes(String(error?.code || ""));
}

async function prefetchCookies(baseUrl) {
  const response = await axiosInstance.get(`${baseUrl}/`, {
    headers: getRequestHeaders("", baseUrl),
    httpsAgent: getHttpsAgent(baseUrl)
  });

  if (response.status < 200 || response.status >= 400) {
    throw toClientError(
      new NseClientError("Unable to reach NSE homepage for cookies.", response.status || 503, "NSE_HOME_UNAVAILABLE"),
      "/",
      baseUrl
    );
  }

  const cookie = toCookieHeader(response.headers?.["set-cookie"]);
  if (!cookie) {
    throw new NseClientError("Unable to establish NSE session cookies.", 503, "NSE_COOKIE_MISSING", {
      path: "/",
      baseUrl
    });
  }

  sessionState.cookie = cookie;
  sessionState.expiresAt = Date.now() + NSE_COOKIE_TTL_MS;
  sessionState.baseUrl = baseUrl;
}

async function ensureSession(baseUrl, forceRefresh = false) {
  if (
    forceRefresh ||
    !sessionState.cookie ||
    Date.now() >= sessionState.expiresAt ||
    sessionState.baseUrl !== baseUrl
  ) {
    await prefetchCookies(baseUrl);
  }
}

async function performApiRequest(baseUrl, path, { refreshSession = true } = {}) {
  await ensureSession(baseUrl, false);

  let response = await axiosInstance.get(`${baseUrl}${path}`, {
    headers: getRequestHeaders(sessionState.cookie, baseUrl),
    httpsAgent: getHttpsAgent(baseUrl)
  });

  if (response.status >= 200 && response.status < 300) {
    return response.data;
  }

  if (refreshSession && [401, 403, 429].includes(Number(response.status))) {
    await ensureSession(baseUrl, true);

    response = await axiosInstance.get(`${baseUrl}${path}`, {
      headers: getRequestHeaders(sessionState.cookie, baseUrl),
      httpsAgent: getHttpsAgent(baseUrl)
    });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
  }

  throw toClientError(
    {
      response,
      message: response?.statusText
    },
    path,
    baseUrl
  );
}

async function nseGet(path, options = {}) {
  const baseUrls = getBaseUrlCandidates();
  let lastError = null;

  for (const baseUrl of baseUrls) {
    for (let attempt = 1; attempt <= NSE_MAX_RETRIES; attempt += 1) {
      try {
        return await performApiRequest(baseUrl, path, options);
      } catch (error) {
        const normalizedError = toClientError(error, path, baseUrl);
        lastError = normalizedError;

        const canRetrySameBase =
          attempt < NSE_MAX_RETRIES &&
          !["NSE_ENDPOINT_NOT_FOUND", "NSE_RESPONSE_ERROR"].includes(normalizedError.code);

        if (canRetrySameBase) {
          await delay(getBackoffDelay(attempt));
          if (normalizedError.code === "NSE_SESSION_REJECTED") {
            sessionState.cookie = "";
            sessionState.expiresAt = 0;
          }
          continue;
        }

        break;
      }
    }

    if (!shouldRotateBaseUrl(lastError)) {
      break;
    }
  }

  throw lastError || new NseClientError("Failed to fetch NSE data.", 503, "NSE_REQUEST_FAILED", { path });
}

module.exports = {
  nseGet,
  NseClientError,
  NSE_REQUEST_TIMEOUT_MS,
  NSE_MAX_RETRIES
};
