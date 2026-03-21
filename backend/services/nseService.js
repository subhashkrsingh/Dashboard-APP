const axios = require("axios");

const NSE_BASE_URL = "https://www.nseindia.com";
const NSE_SECTOR_ENDPOINT = "/api/sectoralIndex";
const NSE_ALL_INDICES_ENDPOINT = "/api/allIndices";
const NSE_REQUEST_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.NSE_REQUEST_TIMEOUT_MS) || 12000, 10000),
  15000
);
const NSE_INTRADAY_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.NSE_INTRADAY_TIMEOUT_MS) || 10000, 10000),
  15000
);
const NSE_REQUESTED_INDEX_NAME = "NIFTY ENERGY";
const NSE_FALLBACK_INDEX_NAME = "NIFTY ENERGY";
const NSE_REAL_ESTATE_INDEX_NAME = "NIFTY REALTY";
const NSE_ENERGY_STOCK_ENDPOINTS = [
  {
    indexName: NSE_REQUESTED_INDEX_NAME,
    path: "/api/equity-stockIndices?index=NIFTY%20ENERGY"
  },
  {
    indexName: NSE_FALLBACK_INDEX_NAME,
    path: "/api/equity-stockIndices?index=NIFTY%20ENERGY"
  }
];
const NSE_REAL_ESTATE_STOCK_ENDPOINTS = [
  {
    indexName: NSE_REAL_ESTATE_INDEX_NAME,
    path: "/api/equity-stockIndices?index=NIFTY%20REALTY"
  }
];

const NSE_OIL_GAS_INDEX_NAME = "NIFTY OIL & GAS";
const NSE_OIL_GAS_STOCK_ENDPOINTS = [
  {
    indexName: NSE_OIL_GAS_INDEX_NAME,
    path: "/api/equity-stockIndices?index=NIFTY%20OIL%20%26%20GAS"
  }
];

const NSE_INTRADAY_ENDPOINT = "/api/chart-databyindex";

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  Referer: "https://www.nseindia.com/market-data/live-equity-market",
  Origin: "https://www.nseindia.com",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "X-Requested-With": "XMLHttpRequest"
};

const NSE_COOKIE_TTL_MS = 50 * 60 * 1000;

const MAJOR_ENERGY_COMPANIES = [
  { symbol: "NTPC", name: "NTPC", aliases: ["NTPC"] },
  {
    symbol: "POWERGRID",
    name: "Power Grid Corporation",
    aliases: ["POWERGRID", "PGCIL"]
  },
  { symbol: "ADANIPOWER", name: "Adani Power", aliases: ["ADANIPOWER"] },
  { symbol: "TATAPOWER", name: "Tata Power", aliases: ["TATAPOWER"] },
  { symbol: "NHPC", name: "NHPC", aliases: ["NHPC"] },
  {
    symbol: "TORNTPOWER",
    name: "Torrent Power",
    aliases: ["TORNTPOWER", "TORRENTPOWER"]
  },
  { symbol: "JSWENERGY", name: "JSW Energy", aliases: ["JSWENERGY"] },
  { symbol: "SJVN", name: "SJVN", aliases: ["SJVN"] },
  { symbol: "CESC", name: "CESC", aliases: ["CESC"] },
  {
    symbol: "RPOWER",
    name: "Reliance Power",
    aliases: ["RPOWER", "RELIANCEPOWER"]
  }
];

const MAJOR_OIL_GAS_COMPANIES = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    aliases: ["RELIANCE", "RELIANCEIND"]
  },
  {
    symbol: "ONGC",
    name: "ONGC",
    aliases: ["ONGC"]
  },
  {
    symbol: "OIL",
    name: "Oil India",
    aliases: ["OIL"]
  },
  {
    symbol: "BPCL",
    name: "BPCL",
    aliases: ["BPCL"]
  },
  {
    symbol: "HPCL",
    name: "HPCL",
    aliases: ["HPCL"]
  },
  {
    symbol: "GAIL",
    name: "GAIL",
    aliases: ["GAIL"]
  }
];

class NseServiceError extends Error {
  constructor(message, statusCode = 503, code = "NSE_UNAVAILABLE") {
    super(message);
    this.name = "NseServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const http = axios.create({
  timeout: NSE_REQUEST_TIMEOUT_MS,
  validateStatus: () => true
});

let sessionCookie = "";
let sessionExpiresAt = 0;

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/,/g, "").replace(/%/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function toCookieHeader(setCookieHeader) {
  if (!Array.isArray(setCookieHeader)) return "";
  return setCookieHeader
    .map(cookie => String(cookie).split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function getNseApiHeaders(cookie) {
  return cookie
    ? {
        ...NSE_HEADERS,
        Cookie: cookie
      }
    : {
        ...NSE_HEADERS
      };
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.indexData)) return payload.indexData;
  if (Array.isArray(payload?.grapthData)) return payload.grapthData;
  if (Array.isArray(payload?.graphData)) return payload.graphData;
  return [];
}

function parseStatusError(response, path) {
  const status = Number(response?.status || 0);
  const messageFromBody =
    response?.data?.message || response?.data?.msg || response?.statusText || "";
  const message = String(messageFromBody || "Failed to fetch NSE data");

  if (status === 429) {
    return new NseServiceError("NSE rate limit reached. Please retry shortly.", 429, "NSE_RATE_LIMIT");
  }
  if (status === 401 || status === 403) {
    return new NseServiceError("NSE rejected the request session.", 503, "NSE_SESSION_REJECTED");
  }
  if (status >= 500) {
    return new NseServiceError("NSE service is temporarily unavailable.", 503, "NSE_UPSTREAM_ERROR");
  }
  if (status === 404) {
    return new NseServiceError(`NSE endpoint not found: ${path}`, 404, "NSE_ENDPOINT_NOT_FOUND");
  }
  return new NseServiceError(message, 503, "NSE_RESPONSE_ERROR");
}

async function establishNseSession() {
  // NSE expects a browser-like session; requesting the live-equity-market page tends to
  // return cookies needed for all subsequent API calls (including chart-databyindex).
  const landingUrl = `${NSE_BASE_URL}/market-data/live-equity-market`;
  const response = await http.get(landingUrl, {
    headers: {
      ...NSE_HEADERS,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
    }
  });

  if (response.status < 200 || response.status >= 400) {
    throw parseStatusError(response, NSE_BASE_URL);
  }

  const cookie = toCookieHeader(response.headers?.["set-cookie"]);
  if (!cookie) {
    throw new NseServiceError("Unable to establish NSE session cookies.", 503, "NSE_COOKIE_MISSING");
  }

  sessionCookie = cookie;
  sessionExpiresAt = Date.now() + NSE_COOKIE_TTL_MS;
}

async function ensureNseSession(forceRefresh = false) {
  if (forceRefresh || !sessionCookie || Date.now() >= sessionExpiresAt) {
    await establishNseSession();
  }
}

async function nseGet(path, { refreshSession = true } = {}) {
  await ensureNseSession(false);

  let response = await http.get(`${NSE_BASE_URL}${path}`, {
    headers: getNseApiHeaders(sessionCookie)
  });

  if (response.status >= 200 && response.status < 300) {
    return response.data;
  }

  if (refreshSession && (response.status === 401 || response.status === 403 || response.status === 429)) {
    await ensureNseSession(true);

    response = await http.get(`${NSE_BASE_URL}${path}`, {
      headers: getNseApiHeaders(sessionCookie)
    });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
  }

  throw parseStatusError(response, path);
}

function findSectorIndex(indexPayload, acceptedIndexNames) {
  const indexes = extractList(indexPayload);
  const acceptedNames = new Set(acceptedIndexNames.map(name => normalizeText(name)));

  return (
    indexes.find(item => {
      const name = item?.index || item?.indexName || item?.name || item?.key;
      return acceptedNames.has(normalizeText(name));
    }) || null
  );
}

function findEnergyIndex(indexPayload) {
  return findSectorIndex(indexPayload, [NSE_REQUESTED_INDEX_NAME, NSE_FALLBACK_INDEX_NAME]);
}

function findRealEstateIndex(indexPayload) {
  return findSectorIndex(indexPayload, [NSE_REAL_ESTATE_INDEX_NAME]);
}

function findOilGasIndex(indexPayload) {
  return findSectorIndex(indexPayload, [NSE_OIL_GAS_INDEX_NAME]);
}

function findIndexSummaryRow(stocksPayload) {
  const rows = extractList(stocksPayload);
  const indexName = String(stocksPayload?.name || "").trim();

  return (
    rows.find(row => normalizeText(row?.symbol) === normalizeText(indexName)) ||
    rows.find(row => normalizeText(row?.symbol || row?.index || row?.name).startsWith("NIFTY")) ||
    null
  );
}

async function fetchEnergyIndexPayload() {
  const candidateEndpoints = [NSE_SECTOR_ENDPOINT, NSE_ALL_INDICES_ENDPOINT];
  let lastError = null;

  for (const endpoint of candidateEndpoints) {
    try {
      const payload = await nseGet(endpoint);
      if (findEnergyIndex(payload)) return payload;
    } catch (error) {
      if (error instanceof NseServiceError && error.code === "NSE_ENDPOINT_NOT_FOUND") {
        continue;
      }
      lastError = error;
    }
  }

  // If not found, return null instead of throwing, so we can use derived index
  return null;
}

async function fetchRealEstateIndexPayload() {
  const candidateEndpoints = [NSE_SECTOR_ENDPOINT, NSE_ALL_INDICES_ENDPOINT];
  let lastError = null;

  for (const endpoint of candidateEndpoints) {
    try {
      const payload = await nseGet(endpoint);
      if (findRealEstateIndex(payload)) return payload;
    } catch (error) {
      if (error instanceof NseServiceError && error.code === "NSE_ENDPOINT_NOT_FOUND") {
        continue;
      }
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  throw new NseServiceError(
    "Requested real estate sector index is unavailable in NSE index feeds.",
    502,
    "REAL_ESTATE_INDEX_MISSING"
  );
}

async function fetchOilGasIndexPayload() {
  const candidateEndpoints = [NSE_SECTOR_ENDPOINT, NSE_ALL_INDICES_ENDPOINT];
  let lastError = null;

  for (const endpoint of candidateEndpoints) {
    try {
      const payload = await nseGet(endpoint);
      if (findOilGasIndex(payload)) return payload;
    } catch (error) {
      if (error instanceof NseServiceError && error.code === "NSE_ENDPOINT_NOT_FOUND") {
        continue;
      }
      lastError = error;
    }
  }

  // If not found, return null instead of throwing, so we can use derived index.
  return null;
}

async function fetchEnergyStocksPayload() {
  let lastError = null;

  for (const candidate of NSE_ENERGY_STOCK_ENDPOINTS) {
    try {
      const payload = await nseGet(candidate.path);
      const rows = extractList(payload);
      if (rows.length > 0) {
        return {
          payload,
          requestedIndexName: candidate.indexName,
          fallbackIndexUsed: candidate.indexName !== NSE_REQUESTED_INDEX_NAME
        };
      }
    } catch (error) {
      if (error instanceof NseServiceError && error.code === "NSE_ENDPOINT_NOT_FOUND") {
        continue;
      }
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  throw new NseServiceError("NSE energy constituents feed is empty.", 502, "ENERGY_STOCKS_EMPTY");
}

async function fetchOilGasStocksPayload() {
  let lastError = null;

  for (const candidate of NSE_OIL_GAS_STOCK_ENDPOINTS) {
    try {
      const payload = await nseGet(candidate.path);
      const rows = extractList(payload);
      if (rows.length > 0) {
        return {
          payload,
          requestedIndexName: candidate.indexName,
          fallbackIndexUsed: candidate.indexName !== NSE_OIL_GAS_INDEX_NAME
        };
      }
    } catch (error) {
      if (error instanceof NseServiceError && error.code === "NSE_ENDPOINT_NOT_FOUND") {
        continue;
      }
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  throw new NseServiceError("NSE oil & gas constituents feed is empty.", 502, "OIL_GAS_STOCKS_EMPTY");
}

async function fetchRealEstateStocksPayload() {
  let lastError = null;

  for (const candidate of NSE_REAL_ESTATE_STOCK_ENDPOINTS) {
    try {
      const payload = await nseGet(candidate.path);
      const rows = extractList(payload);
      if (rows.length > 0) {
        return {
          payload,
          requestedIndexName: candidate.indexName,
          fallbackIndexUsed: false
        };
      }
    } catch (error) {
      if (error instanceof NseServiceError && error.code === "NSE_ENDPOINT_NOT_FOUND") {
        continue;
      }
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  throw new NseServiceError("NSE real estate constituents feed is empty.", 502, "REAL_ESTATE_STOCKS_EMPTY");
}

function deriveIndexFromStocksPayload(stocksPayload) {
  const indexName = String(stocksPayload?.name || "").trim();
  const summaryRow = findIndexSummaryRow(stocksPayload);

  return {
    index: indexName || summaryRow?.symbol || NSE_REQUESTED_INDEX_NAME,
    last: firstNumber(summaryRow?.lastPrice, summaryRow?.ltP, summaryRow?.last),
    change: firstNumber(summaryRow?.change, summaryRow?.netChange, summaryRow?.ch),
    pChange: firstNumber(
      summaryRow?.pChange,
      summaryRow?.percentChange,
      summaryRow?.perChange,
      summaryRow?.pctChange
    ),
    advances: firstNumber(stocksPayload?.advance?.advances, summaryRow?.advances),
    declines: firstNumber(stocksPayload?.advance?.declines, summaryRow?.declines),
    unchanged: firstNumber(stocksPayload?.advance?.unchanged, summaryRow?.unchanged),
    timestamp: String(stocksPayload?.timestamp || summaryRow?.timestamp || "")
  };
}

function formatIntradayTimestamp(value) {
  if (value === null || value === undefined) return null;

  const formatAsTime = date =>
    date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata"
    });

  // Prefer numeric timestamps (ms since epoch)
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return formatAsTime(date);
    }
  }

  // If the API returns seconds since epoch
  if (typeof value === "string" && /^[0-9]{10}$/.test(value)) {
    const date = new Date(Number(value) * 1000);
    if (!Number.isNaN(date.getTime())) {
      return formatAsTime(date);
    }
  }

  // If already ISO-like
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return formatAsTime(new Date(value));
  }

  return String(value);
}

function parseIntradaySeriesPayload(payload) {
  const rawPoints = extractList(payload);
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
    return null;
  }

  const points = rawPoints
    .map(point => {
      if (!point || typeof point !== "object") return null;

      const value = firstNumber(
        point.close,
        point.last,
        point.value,
        point.price,
        point.y
      );

      const timeKey =
        point.time ||
        point.timestamp ||
        point.datetime ||
        point.date;

      const time = formatIntradayTimestamp(timeKey);

      if (value === null || time == null) return null;
      return { time, value };
    })
    .filter(Boolean);

  if (points.length === 0) return null;

  // Sort points by time (when possible). Fall back to original order otherwise.
  const sorted = [...points].sort((a, b) => {
    const aMs = Date.parse(a.time);
    const bMs = Date.parse(b.time);
    if (!Number.isNaN(aMs) && !Number.isNaN(bMs)) {
      return aMs - bMs;
    }
    return a.time.localeCompare(b.time);
  });

  return {
    time: sorted.map(p => p.time),
    value: sorted.map(p => p.value)
  };
}

async function fetchIntradaySeriesFromNse(indexName, duration = "1d") {
  // Wrap the fetch with a fast timeout to prevent client hangs.
  // NSE intraday data is non-critical, so we fail fast and use synthetic curves.
  return Promise.race([
    (async () => {
      const query = `?index=${encodeURIComponent(indexName)}&duration=${encodeURIComponent(duration)}`;
      try {
        const payload = await nseGet(`${NSE_INTRADAY_ENDPOINT}${query}`);
        const series = parseIntradaySeriesPayload(payload);

        if (!series) {
          if (process.env.NODE_ENV !== "production") {
            console.debug(
              "[nse-intraday] NSE returned empty series for",
              indexName,
              "- using synthetic intraday curve"
            );
          }
          return null;
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("[nse-intraday]", indexName, "series points:", series.time.length);
        }
        return series;
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[nse-intraday] fetch error for",
            indexName,
            "-",
            error?.message || error
          );
        }
        return null;
      }
    })(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("timeout")),
        NSE_INTRADAY_TIMEOUT_MS
      )
    )
  ]).catch(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[nse-intraday] timeout for", indexName, "- using synthetic curve");
    }
    return null;
  });
}

function readMetricFromSources(sources, keys) {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const value = firstNumber(source[key]);
      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

function buildIndexReturns(sources) {
  const fieldMap = {
    "1W": ["perChange1W", "perChangeWeek", "weeklyReturn", "return1Week", "oneWeekReturn"],
    "1M": ["perChange30d", "perChange1M", "monthlyReturn", "return1Month", "oneMonthReturn"],
    "3M": ["perChange90d", "perChange3M", "quarterlyReturn", "return3Month", "threeMonthReturn"],
    "6M": ["perChange180d", "perChange6M", "halfYearReturn", "return6Month", "sixMonthReturn"],
    YTD: ["perChangeYtd", "ytdReturn", "returnYtd", "yearToDateReturn"],
    "1Y": ["perChange365d", "perChange1Y", "yearlyReturn", "return1Year", "oneYearReturn"],
    "3Y": ["perChange3Y", "return3Year", "threeYearReturn"],
    "5Y": ["perChange5Y", "return5Year", "fiveYearReturn"]
  };

  const returns = Object.entries(fieldMap).reduce((acc, [window, keys]) => {
    const metric = readMetricFromSources(sources, keys);
    if (metric !== null) {
      acc[window] = metric;
    }
    return acc;
  }, {});

  return Object.keys(returns).length > 0 ? returns : undefined;
}

function buildSectorIndexDetails(indexRow, summaryRow, stocksPayload, stocks, lastPrice, indexChange) {
  const sources = [indexRow, summaryRow, stocksPayload];
  const totalVolume = stocks.reduce((sum, stock) => sum + (stock.volume ?? 0), 0);
  const previousClose =
    readMetricFromSources(sources, ["previousClose", "prevClose", "priorClose", "close", "previous"]) ??
    (lastPrice !== null && indexChange !== null ? lastPrice - indexChange : null);
  const returns = buildIndexReturns(sources);

  return {
    indicativeClose: readMetricFromSources(sources, [
      "indicativeClose",
      "indicativeClosePrice",
      "iVal",
      "indicativeValue"
    ]),
    previousClose,
    open: readMetricFromSources(sources, ["open", "openPrice"]),
    dayHigh: readMetricFromSources(sources, ["dayHigh", "high", "intradayHigh", "intraDayHigh", "highPrice"]),
    dayLow: readMetricFromSources(sources, ["dayLow", "low", "intradayLow", "intraDayLow", "lowPrice"]),
    yearHigh: readMetricFromSources(sources, [
      "yearHigh",
      "yearlyHigh",
      "oneYearHigh",
      "weekHigh",
      "wkhi",
      "yHigh"
    ]),
    yearLow: readMetricFromSources(sources, [
      "yearLow",
      "yearlyLow",
      "oneYearLow",
      "weekLow",
      "wklo",
      "yLow"
    ]),
    tradedVolume:
      readMetricFromSources(sources, ["totalTradedVolume", "tradedVolume", "volume", "totalVolume"]) ?? totalVolume,
    tradedValue: readMetricFromSources(sources, [
      "tradedValue",
      "totalTradedValue",
      "turnover",
      "value",
      "valueInCrores"
    ]),
    ffmCap: readMetricFromSources(sources, ["ffmCap", "ffmc", "ffmcap", "freeFloatMarketCap", "ffMarketCap"]),
    pe: readMetricFromSources(sources, ["pe", "peRatio", "PE", "pE"]),
    pb: readMetricFromSources(sources, ["pb", "pbRatio", "PB", "pB"]),
    returns
  };
}

function toStockRecord(stockItem) {
  const symbol = String(stockItem?.symbol || stockItem?.identifier || "").toUpperCase();
  const name = String(stockItem?.meta?.companyName || stockItem?.companyName || symbol || "").trim();
  const price = firstNumber(stockItem?.lastPrice, stockItem?.ltP, stockItem?.last, stockItem?.price);
  const change = firstNumber(stockItem?.change, stockItem?.netChange, stockItem?.ch);
  const percentChange = firstNumber(
    stockItem?.pChange,
    stockItem?.percentChange,
    stockItem?.perChange,
    stockItem?.pctChange
  );
  const volume = firstNumber(
    stockItem?.totalTradedVolume,
    stockItem?.totalTradedQty,
    stockItem?.volume,
    stockItem?.tradedQuantity
  );

  return {
    symbol,
    company: name || symbol,
    price,
    change,
    percentChange,
    volume
  };
}

function filterConstituents(stocksPayload) {
  const rows = extractList(stocksPayload);
  return rows
    .map(toStockRecord)
    .filter(item => item.symbol && !item.symbol.includes("NIFTY") && item.price !== null);
}

function enrichMajorCompanies(stocks) {
  const byNormalizedSymbol = new Map();
  stocks.forEach(stock => {
    byNormalizedSymbol.set(normalizeText(stock.symbol), stock);
  });

  return MAJOR_ENERGY_COMPANIES.map(target => {
    const matched =
      target.aliases
        .map(alias => byNormalizedSymbol.get(normalizeText(alias)))
        .find(Boolean) || byNormalizedSymbol.get(normalizeText(target.symbol));

    return {
      company: target.name,
      symbol: target.symbol,
      price: matched?.price ?? null,
      change: matched?.change ?? null,
      percentChange: matched?.percentChange ?? null,
      volume: matched?.volume ?? null
    };
  });
}

function buildAdvanceDecline(energyIndex, stocks, stocksPayload) {
  const advances = firstNumber(
    stocksPayload?.advance?.advances,
    energyIndex?.advances,
    energyIndex?.advance,
    energyIndex?.adv
  );
  const declines = firstNumber(
    stocksPayload?.advance?.declines,
    energyIndex?.declines,
    energyIndex?.decline,
    energyIndex?.dec
  );
  const unchanged = firstNumber(
    stocksPayload?.advance?.unchanged,
    energyIndex?.unchanged,
    energyIndex?.noChange,
    energyIndex?.flat
  );

  if (advances !== null || declines !== null || unchanged !== null) {
    return {
      advances: advances ?? 0,
      declines: declines ?? 0,
      unchanged: unchanged ?? 0
    };
  }

  return stocks.reduce(
    (acc, stock) => {
      const pct = stock.percentChange;
      if (pct === null) {
        acc.unchanged += 1;
      } else if (pct > 0) {
        acc.advances += 1;
      } else if (pct < 0) {
        acc.declines += 1;
      } else {
        acc.unchanged += 1;
      }
      return acc;
    },
    { advances: 0, declines: 0, unchanged: 0 }
  );
}

function getMarketStatus() {
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = istNow.getDay();
  const isWeekday = day >= 1 && day <= 5;
  const minutes = istNow.getHours() * 60 + istNow.getMinutes();
  const openMinutes = 9 * 60 + 15;
  const closeMinutes = 15 * 60 + 30;
  const isOpen = isWeekday && minutes >= openMinutes && minutes <= closeMinutes;

  return {
    isOpen,
    label: isOpen ? "OPEN" : "CLOSED",
    timezone: "Asia/Kolkata",
    checkedAt: now.toISOString()
  };
}

function byPercentChangeDesc(a, b) {
  const left = a.percentChange ?? -Infinity;
  const right = b.percentChange ?? -Infinity;
  return right - left;
}

function byPercentChangeAsc(a, b) {
  const left = a.percentChange ?? Infinity;
  const right = b.percentChange ?? Infinity;
  return left - right;
}

async function getEnergySectorData() {
  let sectorPayload = null;
  let stockPayloadDetails;

  try {
    [sectorPayload, stockPayloadDetails] = await Promise.all([
      fetchEnergyIndexPayload(),
      fetchEnergyStocksPayload()
    ]);
  } catch (error) {
    if (error instanceof NseServiceError) throw error;
    throw new NseServiceError(
      `Unable to fetch NSE data: ${error?.message || "Unknown error"}`,
      503,
      "NSE_NETWORK_ERROR"
    );
  }

  const stocksPayload = stockPayloadDetails.payload;
  const sectorIndex = sectorPayload ? findEnergyIndex(sectorPayload) : null;
  const derivedIndex = deriveIndexFromStocksPayload(stocksPayload);
  const summaryRow = findIndexSummaryRow(stocksPayload);
  const energyIndex = sectorIndex || derivedIndex;

  const constituents = filterConstituents(stocksPayload);
  const allStocks = constituents.map(item => ({
    company: item.company,
    symbol: item.symbol,
    price: item.price,
    change: item.change,
    percentChange: item.percentChange,
    volume: item.volume
  }));

  const rankedStocks = allStocks.filter(stock => Number.isFinite(stock.percentChange));
  const sortedByGainers = [...rankedStocks].sort(byPercentChangeDesc);
  const sortedByLosers = [...rankedStocks].sort(byPercentChangeAsc);

  const resolvedIndexName =
    energyIndex?.index ||
    energyIndex?.indexName ||
    stocksPayload?.name ||
    stockPayloadDetails.requestedIndexName ||
    NSE_REQUESTED_INDEX_NAME;

  const resolvedLastPrice = firstNumber(energyIndex?.last, energyIndex?.lastPrice, energyIndex?.ltP);
  const resolvedPercentChange = firstNumber(
    energyIndex?.pChange,
    energyIndex?.percentChange,
    energyIndex?.perChange,
    energyIndex?.changePercent
  );
  const resolvedIndexChange =
    firstNumber(energyIndex?.change, energyIndex?.netChange, energyIndex?.ch) ??
    (resolvedLastPrice !== null && resolvedPercentChange !== null
      ? (resolvedLastPrice * resolvedPercentChange) / 100
      : null);
  const indexDetails = buildSectorIndexDetails(
    sectorIndex,
    summaryRow,
    stocksPayload,
    allStocks,
    resolvedLastPrice,
    resolvedIndexChange
  );

  const allCompanies = [...allStocks]
    .sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)))
    .map(company => ({
      symbol: company.symbol,
      name: company.company,
      price: company.price,
      change: company.change,
      percentChange: company.percentChange,
      volume: company.volume
    }));

  const moversFromAll = (rows) =>
    rows.slice(0, 5).map(item => ({
      symbol: item.symbol,
      name: item.company,
      price: item.price,
      change: item.change,
      percentChange: item.percentChange,
      volume: item.volume
    }));

  return {
    sectorIndex: {
      name: String(resolvedIndexName),
      lastPrice: resolvedLastPrice,
      change: resolvedIndexChange,
      percentChange: resolvedPercentChange,
      ...indexDetails
    },
    companies: allCompanies,
    gainers: moversFromAll(sortedByGainers),
    losers: moversFromAll(sortedByLosers),
    fallbackIndexUsed: stockPayloadDetails.fallbackIndexUsed,
    advanceDecline: buildAdvanceDecline(energyIndex, allStocks, stocksPayload),
    marketStatus: getMarketStatus(),
    requestedIndex: NSE_REQUESTED_INDEX_NAME,
    sourceTimestamp: String(
      energyIndex?.timestamp || sectorPayload?.timestamp || stocksPayload?.timestamp || ""
    ),
    fetchedAt: new Date().toISOString()
  };
}

async function getOilGasSectorData() {
  let sectorPayload = null;
  let stockPayloadDetails;

  try {
    [sectorPayload, stockPayloadDetails] = await Promise.all([
      fetchOilGasIndexPayload(),
      fetchOilGasStocksPayload()
    ]);
  } catch (error) {
    if (error instanceof NseServiceError) throw error;
    throw new NseServiceError(
      `Unable to fetch NSE data: ${error?.message || "Unknown error"}`,
      503,
      "NSE_NETWORK_ERROR"
    );
  }

  const stocksPayload = stockPayloadDetails.payload;
  const sectorIndex = sectorPayload ? findOilGasIndex(sectorPayload) : null;
  const derivedIndex = deriveIndexFromStocksPayload(stocksPayload);
  const summaryRow = findIndexSummaryRow(stocksPayload);
  const oilGasIndex = sectorIndex || derivedIndex;

  const constituents = filterConstituents(stocksPayload);
  const allStocks = constituents.map(item => ({
    company: item.company,
    symbol: item.symbol,
    price: item.price,
    change: item.change,
    percentChange: item.percentChange,
    volume: item.volume
  }));

  const rankedStocks = allStocks.filter(stock => Number.isFinite(stock.percentChange));
  const sortedByGainers = [...rankedStocks].sort(byPercentChangeDesc);
  const sortedByLosers = [...rankedStocks].sort(byPercentChangeAsc);

  const resolvedIndexName =
    oilGasIndex?.index ||
    oilGasIndex?.indexName ||
    stocksPayload?.name ||
    stockPayloadDetails.requestedIndexName ||
    NSE_OIL_GAS_INDEX_NAME;

  const resolvedLastPrice = firstNumber(oilGasIndex?.last, oilGasIndex?.lastPrice, oilGasIndex?.ltP);
  const resolvedPercentChange = firstNumber(
    oilGasIndex?.pChange,
    oilGasIndex?.percentChange,
    oilGasIndex?.perChange,
    oilGasIndex?.changePercent
  );
  const resolvedIndexChange =
    firstNumber(oilGasIndex?.change, oilGasIndex?.netChange, oilGasIndex?.ch) ??
    (resolvedLastPrice !== null && resolvedPercentChange !== null
      ? (resolvedLastPrice * resolvedPercentChange) / 100
      : null);
  const indexDetails = buildSectorIndexDetails(
    sectorIndex,
    summaryRow,
    stocksPayload,
    allStocks,
    resolvedLastPrice,
    resolvedIndexChange
  );

  const allCompaniesSorted = [...allStocks]
    .sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)))
    .map(company => ({
      symbol: company.symbol,
      name: company.company,
      price: company.price,
      change: company.change,
      percentChange: company.percentChange,
      volume: company.volume
    }));

  const moversFromAll = rows =>
    rows.slice(0, 5).map(item => ({
      symbol: item.symbol,
      name: item.company,
      price: item.price,
      change: item.change,
      percentChange: item.percentChange,
      volume: item.volume
    }));

  return {
    sectorIndex: {
      name: String(resolvedIndexName),
      lastPrice: resolvedLastPrice,
      change: resolvedIndexChange,
      percentChange: resolvedPercentChange,
      ...indexDetails
    },
    companies: allCompaniesSorted,
    gainers: moversFromAll(sortedByGainers),
    losers: moversFromAll(sortedByLosers),
    fallbackIndexUsed: stockPayloadDetails.fallbackIndexUsed,
    advanceDecline: buildAdvanceDecline(oilGasIndex, allStocks, stocksPayload),
    marketStatus: getMarketStatus(),
    requestedIndex: NSE_OIL_GAS_INDEX_NAME,
    sourceTimestamp: String(
      oilGasIndex?.timestamp || sectorPayload?.timestamp || stocksPayload?.timestamp || ""
    ),
    fetchedAt: new Date().toISOString()
  };
}

async function getRealEstateSectorData() {
  let sectorPayload;
  let stockPayloadDetails;

  try {
    [sectorPayload, stockPayloadDetails] = await Promise.all([
      fetchRealEstateIndexPayload(),
      fetchRealEstateStocksPayload()
    ]);
  } catch (error) {
    if (error instanceof NseServiceError) throw error;
    throw new NseServiceError(
      `Unable to fetch NSE data: ${error?.message || "Unknown error"}`,
      503,
      "NSE_NETWORK_ERROR"
    );
  }

  const stocksPayload = stockPayloadDetails.payload;
  const sectorIndex = findRealEstateIndex(sectorPayload);
  const derivedIndex = deriveIndexFromStocksPayload(stocksPayload);
  const summaryRow = findIndexSummaryRow(stocksPayload);
  const realEstateIndex = sectorIndex || derivedIndex;

  const constituents = filterConstituents(stocksPayload);
  const allStocks = constituents.map(item => ({
    company: item.company,
    symbol: item.symbol,
    price: item.price,
    change: item.change,
    percentChange: item.percentChange,
    volume: item.volume
  }));

  const rankedStocks = allStocks.filter(stock => Number.isFinite(stock.percentChange));
  const sortedByGainers = [...rankedStocks].sort(byPercentChangeDesc);
  const sortedByLosers = [...rankedStocks].sort(byPercentChangeAsc);

  const resolvedIndexName =
    realEstateIndex?.index ||
    realEstateIndex?.indexName ||
    stocksPayload?.name ||
    stockPayloadDetails.requestedIndexName ||
    NSE_REAL_ESTATE_INDEX_NAME;

  const resolvedLastPrice = firstNumber(realEstateIndex?.last, realEstateIndex?.lastPrice, realEstateIndex?.ltP);
  const resolvedPercentChange = firstNumber(
    realEstateIndex?.pChange,
    realEstateIndex?.percentChange,
    realEstateIndex?.perChange,
    realEstateIndex?.changePercent
  );
  const resolvedIndexChange =
    firstNumber(realEstateIndex?.change, realEstateIndex?.netChange, realEstateIndex?.ch) ??
    (resolvedLastPrice !== null && resolvedPercentChange !== null
      ? (resolvedLastPrice * resolvedPercentChange) / 100
      : null);
  const indexDetails = buildSectorIndexDetails(
    sectorIndex,
    summaryRow,
    stocksPayload,
    allStocks,
    resolvedLastPrice,
    resolvedIndexChange
  );

  const allCompanies = [...allStocks]
    .sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)))
    .map(company => ({
      symbol: company.symbol,
      name: company.company,
      price: company.price,
      change: company.change,
      percentChange: company.percentChange,
      volume: company.volume
    }));

  const moversFromAll = rows =>
    rows.slice(0, 5).map(item => ({
      symbol: item.symbol,
      name: item.company,
      price: item.price,
      change: item.change,
      percentChange: item.percentChange,
      volume: item.volume
    }));

  return {
    sectorIndex: {
      name: String(resolvedIndexName),
      lastPrice: resolvedLastPrice,
      change: resolvedIndexChange,
      percentChange: resolvedPercentChange,
      ...indexDetails
    },
    companies: allCompanies,
    gainers: moversFromAll(sortedByGainers),
    losers: moversFromAll(sortedByLosers),
    fallbackIndexUsed: false,
    advanceDecline: buildAdvanceDecline(realEstateIndex, allStocks, stocksPayload),
    marketStatus: getMarketStatus(),
    requestedIndex: NSE_REAL_ESTATE_INDEX_NAME,
    sourceTimestamp: String(
      realEstateIndex?.timestamp || sectorPayload?.timestamp || stocksPayload?.timestamp || ""
    ),
    fetchedAt: new Date().toISOString()
  };
}

module.exports = {
  getEnergySectorData,
  getOilGasSectorData,
  getRealEstateSectorData,
  fetchIntradaySeriesFromNse,
  NseServiceError
};
