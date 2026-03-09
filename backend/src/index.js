const express = require('express');
const { fyersModel } = require('fyers-api-v3');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const tokenManager = require('./tokenManager');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve built frontend (Vite output in ../frontend/dist)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.use(express.json());

// Symbols (FYERS format, NSE equities). Use NSE:SYMBOL-EQ
const symbols = [
  'NSE:NTPC-EQ',
  'NSE:NHPC-EQ',
  'NSE:TATAPOWER-EQ',
  'NSE:ADANIPOWER-EQ',
  'NSE:ADANIGREEN-EQ',
  'NSE:POWERGRID-EQ',
  'NSE:JSWENERGY-EQ',
  'NSE:TORNTPOWER-EQ',
  'NSE:RPOWER-EQ'
];

// Basic company metadata for UI labels
const companies = [
  { symbol: 'NSE:NTPC-EQ', name: 'NTPC Limited', sector: 'Power Generation' },
  { symbol: 'NSE:NHPC-EQ', name: 'NHPC Limited', sector: 'Hydro Power' },
  { symbol: 'NSE:TATAPOWER-EQ', name: 'Tata Power Company Limited', sector: 'Power Generation' },
  { symbol: 'NSE:ADANIPOWER-EQ', name: 'Adani Power Limited', sector: 'Thermal Power' },
  { symbol: 'NSE:ADANIGREEN-EQ', name: 'Adani Green Energy Limited', sector: 'Renewables' },
  { symbol: 'NSE:POWERGRID-EQ', name: 'Power Grid Corporation of India Limited', sector: 'Transmission' },
  { symbol: 'NSE:JSWENERGY-EQ', name: 'JSW Energy Limited', sector: 'Power Generation' },
  { symbol: 'NSE:TORNTPOWER-EQ', name: 'Torrent Power Limited', sector: 'Power Distribution' },
  { symbol: 'NSE:RPOWER-EQ', name: 'Reliance Power Limited', sector: 'Power Generation' }
];
const companyBySymbol = companies.reduce((acc, company) => {
  acc[company.symbol] = company;
  return acc;
}, {});

let quotes = {};
const symbolStatus = {}; // symbol -> { status, message, updatedAt }

const env = key => (process.env[key] || '').trim();

const FYERS_APP_ID = env('FYERS_APP_ID');
const INITIAL_ACCESS_TOKEN = env('FYERS_ACCESS_TOKEN');
const INITIAL_REFRESH_TOKEN = env('FYERS_REFRESH_TOKEN');
const FYERS_SECRET_ID = env('FYERS_SECRET_ID') || env('FYERS_SECRET_KEY');
const FYERS_DATA_HOST = env('FYERS_DATA_HOST') || 'https://api.fyers.in';
const FYERS_REDIRECT_URI = env('FYERS_REDIRECT_URI');
const FYERS_AUTH_HOST = (env('FYERS_AUTH_HOST') || 'https://api-t1.fyers.in/api/v3').replace(/\/+$/, '');
const FYERS_TOKEN_HOST = (env('FYERS_TOKEN_HOST') || 'https://api.fyers.in/api/v3').replace(/\/+$/, '');
const FYERS_PIN = env('FYERS_PIN');
const POLL_INTERVAL_MS = Number.parseInt(process.env.FYERS_POLL_INTERVAL_MS, 10) || 12000;
const REFRESH_BEFORE_SEC = Number.parseInt(process.env.FYERS_REFRESH_BEFORE_SEC, 10) || 300;
const REFRESH_BEFORE_MS = Math.max(60, REFRESH_BEFORE_SEC) * 1000;
const FYERS_PERSIST_AUTH_TO_ENV = env('FYERS_PERSIST_AUTH_TO_ENV') === 'true';
const FYERS_TOKEN_PATH = env('FYERS_TOKEN_PATH') || '/token';
const FYERS_TOKEN_ENDPOINT = env('FYERS_TOKEN_ENDPOINT');
const FYERS_USE_REFRESH_TOKEN = (() => {
  const raw = env('FYERS_USE_REFRESH_TOKEN').toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // If flag is not set, auto-enable refresh when a refresh token is present.
  return Boolean(INITIAL_REFRESH_TOKEN);
})();
const COMPANY_OVERVIEW_CACHE_TTL_MS =
  Number.parseInt(process.env.COMPANY_OVERVIEW_CACHE_TTL_MS, 10) || 8000;
const COMPANY_HISTORY_CACHE_TTL_MS =
  Number.parseInt(process.env.COMPANY_HISTORY_CACHE_TTL_MS, 10) || 60000;
let pollIntervalId = null;
let fyersClient = null;
let refreshInFlight = null;
let pollInFlight = null;
let lastBroadcastPayload = '';
let lastQuoteFetchBlockReason = '';
const companyOverviewCache = new Map(); // symbol -> { expiresAt, data }
const companyHistoryCache = new Map(); // key -> { expiresAt, data }
const companyOverviewInFlight = new Map(); // symbol -> Promise<data>
const companyHistoryInFlight = new Map(); // key -> Promise<data>

tokenManager.setTokens({
  accessToken: INITIAL_ACCESS_TOKEN,
  refreshToken: INITIAL_REFRESH_TOKEN
});

function setRuntimeAccessToken(token) {
  tokenManager.setAccessToken(token);
  const activeAccessToken = tokenManager.getAccessToken();
  if (fyersClient && activeAccessToken) {
    fyersClient.setAccessToken(activeAccessToken);
  }
}

function setRuntimeRefreshToken(token) {
  tokenManager.setRefreshToken(token);
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function upsertEnvValue(content, key, value) {
  const safeValue = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const nextLine = `${key}="${safeValue}"`;
  const lineRegex = new RegExp(`^\\s*${escapeRegex(key)}\\s*=.*$`, 'm');
  if (lineRegex.test(content)) return content.replace(lineRegex, nextLine);
  return content.trimEnd() ? `${content.trimEnd()}\n${nextLine}\n` : `${nextLine}\n`;
}

function persistRuntimeTokensToEnv() {
  if (!FYERS_PERSIST_AUTH_TO_ENV) return;
  const envPath = path.join(__dirname, '..', '.env');
  try {
    const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    let next = existing;
    const accessToken = tokenManager.getAccessToken();
    const refreshToken = tokenManager.getRefreshToken();
    if (accessToken) next = upsertEnvValue(next, 'FYERS_ACCESS_TOKEN', accessToken);
    if (refreshToken) next = upsertEnvValue(next, 'FYERS_REFRESH_TOKEN', refreshToken);
    if (next !== existing) fs.writeFileSync(envPath, next, 'utf8');
  } catch (err) {
    console.error('Failed to persist FYERS tokens:', err.message);
  }
}

function getAppIdHash() {
  return crypto.createHash('sha256').update(`${FYERS_APP_ID}:${FYERS_SECRET_ID}`).digest('hex');
}

function buildTokenExchangeUrl() {
  if (FYERS_TOKEN_ENDPOINT) return FYERS_TOKEN_ENDPOINT;
  if (FYERS_TOKEN_HOST.toLowerCase().endsWith('/token')) return FYERS_TOKEN_HOST;
  const tokenPath = FYERS_TOKEN_PATH.startsWith('/') ? FYERS_TOKEN_PATH : `/${FYERS_TOKEN_PATH}`;
  return `${FYERS_TOKEN_HOST}${tokenPath}`;
}

function getIncomingCallbackBaseUrl(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host') || '';
  return `${protocol}://${host}${req.path}`;
}

function getRedirectMismatchHint(req) {
  if (!FYERS_REDIRECT_URI) return null;
  const incomingBase = getIncomingCallbackBaseUrl(req);
  const expectedBase = String(FYERS_REDIRECT_URI).split('?')[0];
  if (incomingBase === expectedBase) return null;
  return `FYERS_REDIRECT_URI mismatch. Expected "${expectedBase}" but callback received "${incomingBase}"`;
}

function isLikelyAuthError(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {});
  const lower = text.toLowerCase();
  return (
    lower.includes('token') ||
    lower.includes('auth') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid') ||
    lower.includes('expired')
  );
}

async function refreshAccessToken(reason) {
  if (refreshInFlight) return refreshInFlight;
  if (!FYERS_APP_ID || !FYERS_SECRET_ID || !tokenManager.getRefreshToken()) return false;
  if (typeof fetch !== 'function') {
    console.error('Token refresh skipped: global fetch is unavailable in this Node runtime');
    return false;
  }

  refreshInFlight = (async () => {
    const body = {
      grant_type: 'refresh_token',
      appIdHash: getAppIdHash(),
      refresh_token: tokenManager.getRefreshToken()
    };
    if (FYERS_PIN) body.pin = FYERS_PIN;

    const refreshUrls = Array.from(new Set([
      `${FYERS_AUTH_HOST}/validate-refresh-token`,
      `${FYERS_TOKEN_HOST}/validate-refresh-token`
    ]));
    let lastError = 'Unknown refresh failure';

    for (const url of refreshUrls) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const refreshedAccessToken = (data?.access_token || data?.accessToken || '').trim();
      const refreshedRefreshToken = (data?.refresh_token || data?.refreshToken || '').trim();
      if (response.ok && refreshedAccessToken) {
        setRuntimeAccessToken(refreshedAccessToken);
        if (refreshedRefreshToken) setRuntimeRefreshToken(refreshedRefreshToken);
        persistRuntimeTokensToEnv();
        console.log(`FYERS access token refreshed (${reason})`);
        return true;
      }

      lastError = data?.message || data?.msg || `HTTP ${response.status}`;
    }

    throw new Error(lastError);
  })()
    .catch(err => {
      console.error(`FYERS token refresh failed (${reason}):`, err.message);
      return false;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function exchangeAuthCode(authCode) {
  if (typeof fetch !== 'function') {
    throw new Error('Token exchange skipped: global fetch is unavailable in this Node runtime');
  }
  const body = {
    grant_type: 'authorization_code',
    appIdHash: getAppIdHash(),
    code: String(authCode || '').trim()
  };
  const tokenUrl = buildTokenExchangeUrl();
  const primaryResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  let primaryData = null;
  try {
    primaryData = await primaryResponse.json();
  } catch {
    primaryData = null;
  }

  const primaryToken = (primaryData?.access_token || primaryData?.accessToken || '').trim();
  if (primaryResponse.ok && primaryToken) return primaryData;

  // FYERS API versions differ across accounts; fallback keeps compatibility.
  const fallbackResponse = await fetch(`${FYERS_AUTH_HOST}/validate-authcode`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  let fallbackData = null;
  try {
    fallbackData = await fallbackResponse.json();
  } catch {
    fallbackData = null;
  }

  const fallbackToken = (fallbackData?.access_token || fallbackData?.accessToken || '').trim();
  if (fallbackResponse.ok && fallbackToken) return fallbackData;

  const secondaryFallbackResponse = await fetch(`${FYERS_TOKEN_HOST}/validate-authcode`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  let secondaryFallbackData = null;
  try {
    secondaryFallbackData = await secondaryFallbackResponse.json();
  } catch {
    secondaryFallbackData = null;
  }

  const secondaryFallbackToken = (secondaryFallbackData?.access_token || secondaryFallbackData?.accessToken || '').trim();
  if (secondaryFallbackResponse.ok && secondaryFallbackToken) return secondaryFallbackData;

  const primaryReason = primaryData?.message || primaryData?.msg || `HTTP ${primaryResponse.status}`;
  const fallbackReason = fallbackData?.message || fallbackData?.msg || `HTTP ${fallbackResponse.status}`;
  const secondaryFallbackReason = secondaryFallbackData?.message || secondaryFallbackData?.msg || `HTTP ${secondaryFallbackResponse.status}`;
  throw new Error(`Token exchange failed: ${primaryReason}; fallback1: ${fallbackReason}; fallback2: ${secondaryFallbackReason}`);
}

function getFyersClient() {
  if (!fyersClient) {
    fyersClient = new fyersModel({
      path: __dirname,
      enableLogging: false
    });
    if (FYERS_APP_ID) fyersClient.setAppId(FYERS_APP_ID);
    if (FYERS_REDIRECT_URI) fyersClient.setRedirectUrl(FYERS_REDIRECT_URI);
  }
  const accessToken = tokenManager.getAccessToken();
  if (accessToken) fyersClient.setAccessToken(accessToken);
  return fyersClient;
}

function setStatus(symbol, status, message) {
  symbolStatus[symbol] = {
    status,
    message,
    updatedAt: new Date().toISOString()
  };
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeTimestamp(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return new Date().toISOString();
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function normalizeFyersQuote(item) {
  const symbol = item?.n || item?.symbol || item?.v?.symbol;
  const v = item?.v || item;
  const price = parseNumber(v?.lp ?? v?.ltp ?? v?.last_price ?? v?.price);
  if (!symbol || price === null) return null;

  const changePercent = parseNumber(v?.chp);
  const timestamp = v?.tt ? normalizeTimestamp(v.tt) : new Date().toISOString();

  return {
    symbol,
    price,
    changePercent: Number.isFinite(changePercent) ? changePercent / 100 : null,
    timestamp
  };
}

function pickFirstNumber(...values) {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function decodeSymbolParam(rawSymbol) {
  const raw = String(rawSymbol || '').trim();
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getCompanyMeta(symbol) {
  if (companyBySymbol[symbol]) return companyBySymbol[symbol];
  const cleaned = symbol.replace(/^NSE:/, '').replace(/-EQ$/, '');
  return {
    symbol,
    name: cleaned || symbol,
    sector: 'Power'
  };
}

function toDateYmd(value) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

function sanitizeHistoryResolution(value) {
  const text = String(value || '').trim().toUpperCase();
  const allowed = new Set(['1', '2', '3', '5', '10', '15', '30', '60', '120', '240', 'D']);
  if (!allowed.has(text)) return null;
  return text;
}

function buildHistoryRequest(symbol, query = {}) {
  const rangeToDays = {
    '1D': 5,
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365
  };
  const requestedRange = String(query.range || '3M').toUpperCase();
  const range = rangeToDays[requestedRange] ? requestedRange : '3M';
  const defaultResolution = range === '1D' ? '15' : 'D';
  const resolution = sanitizeHistoryResolution(query.resolution) || defaultResolution;
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - rangeToDays[range]);

  return {
    range,
    resolution,
    request: {
      symbol,
      resolution,
      date_format: '1',
      range_from: toDateYmd(start),
      range_to: toDateYmd(now),
      cont_flag: '1'
    }
  };
}

function mapHistoryCandles(historyResponse) {
  const sourceCandles = Array.isArray(historyResponse?.candles)
    ? historyResponse.candles
    : (Array.isArray(historyResponse?.data?.candles) ? historyResponse.data.candles : []);

  return sourceCandles
    .map(candle => {
      if (!Array.isArray(candle) || candle.length < 5) return null;
      const timestampValue = parseNumber(candle[0]);
      if (timestampValue === null) return null;
      const open = parseNumber(candle[1]);
      const high = parseNumber(candle[2]);
      const low = parseNumber(candle[3]);
      const close = parseNumber(candle[4]);
      const volume = parseNumber(candle[5]);
      if (open === null || high === null || low === null || close === null) return null;
      return {
        timestamp: normalizeTimestamp(timestampValue),
        open,
        high,
        low,
        close,
        volume
      };
    })
    .filter(Boolean);
}

function extractQuoteNode(quoteResponse, symbol) {
  if (!quoteResponse || typeof quoteResponse !== 'object') return null;
  const list = Array.isArray(quoteResponse?.d)
    ? quoteResponse.d
    : (Array.isArray(quoteResponse?.data) ? quoteResponse.data : []);
  if (list.length === 0) return null;
  return list.find(item => (item?.n || item?.symbol || item?.v?.symbol) === symbol) || list[0];
}

function normalizeQuoteSnapshot(item, symbol) {
  if (!item || typeof item !== 'object') return null;
  const v = item?.v || item;
  const currentSymbol = symbol || item?.n || item?.symbol || v?.symbol || null;
  if (!currentSymbol) return null;

  const lastPrice = pickFirstNumber(v?.lp, v?.ltp, v?.last_price, v?.price);
  const prevClose = pickFirstNumber(v?.prev_close_price, v?.prev_close, v?.pc, v?.c);
  const rawChange = pickFirstNumber(v?.ch, v?.change);
  const change = rawChange !== null
    ? rawChange
    : (lastPrice !== null && prevClose !== null ? (lastPrice - prevClose) : null);
  const rawChangePercent = pickFirstNumber(v?.chp, v?.change_percent, v?.p_change, v?.perc_change);
  const changePercent = (change !== null && prevClose && prevClose !== 0)
    ? (change / prevClose) * 100
    : rawChangePercent;

  return {
    symbol: currentSymbol,
    price: lastPrice,
    change,
    changePercent,
    open: pickFirstNumber(v?.open_price, v?.open, v?.o),
    high: pickFirstNumber(v?.high_price, v?.high, v?.h),
    low: pickFirstNumber(v?.low_price, v?.low, v?.l),
    previousClose: prevClose,
    volume: pickFirstNumber(v?.vol_traded_today, v?.volume, v?.v),
    upperCircuit: pickFirstNumber(v?.upper_ckt, v?.upper_circuit, v?.uc),
    lowerCircuit: pickFirstNumber(v?.lower_ckt, v?.lower_circuit, v?.lc),
    yearHigh: pickFirstNumber(v?.['52_week_high_price'], v?.week_52_high, v?.yh),
    yearLow: pickFirstNumber(v?.['52_week_low_price'], v?.week_52_low, v?.yl),
    bid: pickFirstNumber(v?.bid, v?.bp),
    ask: pickFirstNumber(v?.ask, v?.sp),
    timestamp: v?.tt ? normalizeTimestamp(v.tt) : new Date().toISOString()
  };
}

function normalizeDepthLevel(level) {
  if (!level) return null;
  if (Array.isArray(level)) {
    const price = pickFirstNumber(level[0]);
    const quantity = pickFirstNumber(level[1]);
    const orders = pickFirstNumber(level[2]);
    if (price === null && quantity === null && orders === null) return null;
    return { price, quantity, orders };
  }
  if (typeof level === 'object') {
    const price = pickFirstNumber(level?.price, level?.p, level?.rate, level?.bid_price, level?.ask_price);
    const quantity = pickFirstNumber(level?.qty, level?.q, level?.volume, level?.v, level?.quantity);
    const orders = pickFirstNumber(level?.orders, level?.o, level?.order_count);
    if (price === null && quantity === null && orders === null) return null;
    return { price, quantity, orders };
  }
  return null;
}

function extractDepthNode(depthResponse, symbol) {
  if (!depthResponse || typeof depthResponse !== 'object') return null;
  if (depthResponse?.d && typeof depthResponse.d === 'object' && !Array.isArray(depthResponse.d)) {
    if (depthResponse.d[symbol]) return depthResponse.d[symbol];
  }
  if (depthResponse?.data && typeof depthResponse.data === 'object' && !Array.isArray(depthResponse.data)) {
    if (depthResponse.data[symbol]) return depthResponse.data[symbol];
  }

  const list = Array.isArray(depthResponse?.d)
    ? depthResponse.d
    : (Array.isArray(depthResponse?.data) ? depthResponse.data : []);
  if (list.length === 0) return null;
  const node = list.find(item => (item?.n || item?.symbol || item?.v?.symbol) === symbol) || list[0];
  return node?.v || node;
}

function normalizeTradeSnapshot(depthNode) {
  if (!depthNode || typeof depthNode !== 'object') return null;
  const bidsRaw = depthNode?.bids || depthNode?.bid || depthNode?.buy || depthNode?.depth?.buy || [];
  const asksRaw = depthNode?.ask || depthNode?.asks || depthNode?.sell || depthNode?.depth?.sell || [];
  const bids = (Array.isArray(bidsRaw) ? bidsRaw : []).map(normalizeDepthLevel).filter(Boolean).slice(0, 5);
  const asks = (Array.isArray(asksRaw) ? asksRaw : []).map(normalizeDepthLevel).filter(Boolean).slice(0, 5);
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const spread = (bestBid !== null && bestAsk !== null) ? (bestAsk - bestBid) : null;

  return {
    totalBidQty: pickFirstNumber(depthNode?.totalbuyqty, depthNode?.total_buy_qty, depthNode?.tbq),
    totalAskQty: pickFirstNumber(depthNode?.totalsellqty, depthNode?.total_sell_qty, depthNode?.tsq),
    dayOpen: pickFirstNumber(depthNode?.o, depthNode?.open, depthNode?.open_price),
    dayHigh: pickFirstNumber(depthNode?.h, depthNode?.high, depthNode?.high_price),
    dayLow: pickFirstNumber(depthNode?.l, depthNode?.low, depthNode?.low_price),
    previousClose: pickFirstNumber(depthNode?.c, depthNode?.close, depthNode?.prev_close),
    averageTradedPrice: pickFirstNumber(depthNode?.atp, depthNode?.avg_trade_price),
    volume: pickFirstNumber(depthNode?.v, depthNode?.volume, depthNode?.vol_traded_today),
    lastTradedQty: pickFirstNumber(depthNode?.ltq, depthNode?.last_traded_qty),
    bestBid,
    bestAsk,
    spread,
    bids,
    asks,
    timestamp: depthNode?.tt ? normalizeTimestamp(depthNode.tt) : new Date().toISOString()
  };
}

function getCachedValue(cacheMap, key) {
  const entry = cacheMap.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cacheMap.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedValue(cacheMap, key, data, ttlMs) {
  const ttl = Math.max(1000, Number(ttlMs) || 0);
  cacheMap.set(key, {
    data,
    expiresAt: Date.now() + ttl
  });
}

async function ensureDataAccess(contextReason) {
  if (!FYERS_APP_ID) return 'FYERS_APP_ID not set';

  const hasRefreshToken = FYERS_USE_REFRESH_TOKEN && Boolean(tokenManager.getRefreshToken());
  if (tokenManager.getAccessToken()) {
    if (hasRefreshToken && tokenManager.accessTokenExpiresSoon(REFRESH_BEFORE_MS)) {
      await refreshAccessToken(`${contextReason}_expiring_soon`);
    }
    if (tokenManager.getAccessToken()) return null;
  }

  if (!hasRefreshToken) return 'FYERS access token unavailable. Complete /auth/start login flow.';
  const refreshed = await refreshAccessToken(`${contextReason}_missing_access_token`);
  if (refreshed && tokenManager.getAccessToken()) return null;
  return 'FYERS access token unavailable (refresh failed). Complete /auth/start login flow.';
}

async function runFyersRequest(requestFn, reason, options = {}) {
  const retryOnAuthError = options.retryOnAuthError !== false;
  const hasRefreshToken = FYERS_USE_REFRESH_TOKEN && Boolean(tokenManager.getRefreshToken());

  try {
    const data = await requestFn(getFyersClient());
    if (
      retryOnAuthError &&
      hasRefreshToken &&
      data &&
      typeof data === 'object' &&
      data?.s &&
      String(data.s).toLowerCase() !== 'ok' &&
      isLikelyAuthError(data)
    ) {
      const refreshed = await refreshAccessToken(`${reason}_response_auth_error`);
      if (refreshed) return requestFn(getFyersClient());
    }
    return data;
  } catch (err) {
    if (retryOnAuthError && hasRefreshToken && isLikelyAuthError(err)) {
      const refreshed = await refreshAccessToken(`${reason}_exception_auth_error`);
      if (refreshed) return requestFn(getFyersClient());
    }
    throw err;
  }
}

async function fetchFyersQuotes(symbolList, options = {}) {
  const attemptedRefresh = options.attemptedRefresh === true;
  const accessToken = tokenManager.getAccessToken();
  const refreshToken = tokenManager.getRefreshToken();
  const hasRefreshToken = FYERS_USE_REFRESH_TOKEN && Boolean(refreshToken);

  if (!accessToken && hasRefreshToken && !attemptedRefresh) {
    const refreshed = await refreshAccessToken('missing_access_token');
    if (refreshed) return fetchFyersQuotes(symbolList, { attemptedRefresh: true });
  }

  if (tokenManager.accessTokenExpiresSoon(REFRESH_BEFORE_MS) && hasRefreshToken && !attemptedRefresh) {
    await refreshAccessToken('expiring_soon');
  }

  if (!FYERS_APP_ID || !tokenManager.getAccessToken()) {
    const missing = !FYERS_APP_ID
      ? 'FYERS_APP_ID not set'
      : (hasRefreshToken
        ? 'FYERS access token unavailable (refresh failed)'
        : 'FYERS access token unavailable. Visit /auth/start to log in');
    if (lastQuoteFetchBlockReason !== missing) {
      console.warn(`${missing} -- cannot fetch quotes`);
      lastQuoteFetchBlockReason = missing;
    }
    symbolList.forEach(symbol => setStatus(symbol, 'no_key', missing));
    return [];
  }
  lastQuoteFetchBlockReason = '';

  try {
    const fyers = getFyersClient();
    const j = await fyers.getQuotes(symbolList);
    const data = Array.isArray(j?.d) ? j.d : [];

    if (j?.s !== 'ok' && data.length === 0) {
      const msg = j?.message || j?.msg || j?.s || 'Unknown error from FYERS';
      if (!attemptedRefresh && hasRefreshToken && isLikelyAuthError({ msg, code: j?.code, s: j?.s })) {
        const refreshed = await refreshAccessToken('quote_response_auth_error');
        if (refreshed) return fetchFyersQuotes(symbolList, { attemptedRefresh: true });
      }
      symbolList.forEach(symbol => setStatus(symbol, 'error', msg));
      return [];
    }

    const seen = new Set();
    const out = [];
    data.forEach(item => {
      const normalized = normalizeFyersQuote(item);
      if (!normalized) return;
      seen.add(normalized.symbol);
      out.push(normalized);
      setStatus(normalized.symbol, 'ok', 'Quote available');
    });

    symbolList.forEach(symbol => {
      if (!seen.has(symbol)) {
        setStatus(symbol, 'no_data', 'No quote data returned');
      }
    });

    return out;
  } catch (err) {
    const message = err?.message || 'Unknown fetch error';
    if (!attemptedRefresh && hasRefreshToken && isLikelyAuthError(err)) {
      const refreshed = await refreshAccessToken('quote_exception_auth_error');
      if (refreshed) return fetchFyersQuotes(symbolList, { attemptedRefresh: true });
    }
    console.error('fetch error', message);
    symbolList.forEach(symbol => setStatus(symbol, 'error', message));
    return [];
  }
}

function ensureAuthConfig(res) {
  if (!FYERS_APP_ID || !FYERS_SECRET_ID || !FYERS_REDIRECT_URI) {
    res.status(400).json({
      error: 'Missing FYERS_APP_ID, FYERS_SECRET_ID/FYERS_SECRET_KEY, or FYERS_REDIRECT_URI'
    });
    return false;
  }
  return true;
}

function broadcastQuotes() {
  const payload = JSON.stringify({ type: 'quotes', data: Object.values(quotes) });
  if (payload === lastBroadcastPayload) return;
  lastBroadcastPayload = payload;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

async function pollAllSymbols() {
  if (pollInFlight) return pollInFlight;
  pollInFlight = (async () => {
    const data = await fetchFyersQuotes(symbols);
    if (data.length === 0) return;
    let hasUpdate = false;
    data.forEach(q => {
      const prev = quotes[q.symbol];
      quotes[q.symbol] = q;
      if (
        !prev ||
        prev.price !== q.price ||
        prev.timestamp !== q.timestamp ||
        prev.changePercent !== q.changePercent
      ) {
        hasUpdate = true;
      }
    });
    if (hasUpdate) broadcastQuotes();
  })().finally(() => {
    pollInFlight = null;
  });
  return pollInFlight;
}

wss.on('connection', ws => {
  console.log('client connected');
  // send initial hello and snapshot
  ws.send(JSON.stringify({ type: 'hello', symbols }));
  ws.send(JSON.stringify({ type: 'quotes', data: Object.values(quotes) }));
});

function startPolling() {
  if (pollIntervalId) return;
  console.log(`Starting FYERS polling every ${POLL_INTERVAL_MS / 1000}s`);
  pollIntervalId = setInterval(pollAllSymbols, POLL_INTERVAL_MS);
  // do immediate poll
  pollAllSymbols();
}

// Start polling on boot
startPolling();

app.get('/api/quotes', (req, res) => res.json(Object.values(quotes)));

// Companies metadata for UI
app.get('/api/companies', (req, res) => {
  const withStatus = companies.map(c => ({
    ...c,
    status: symbolStatus[c.symbol]?.status ?? 'pending',
    statusMessage: symbolStatus[c.symbol]?.message ?? 'Waiting for quote fetch',
    statusUpdatedAt: symbolStatus[c.symbol]?.updatedAt ?? null
  }));
  res.json(withStatus);
});

app.get('/api/company/:symbol', async (req, res) => {
  const symbol = decodeSymbolParam(req.params.symbol);
  if (!symbol) {
    res.status(400).json({ error: 'Missing symbol' });
    return;
  }
  if (!symbols.includes(symbol)) {
    res.status(404).json({ error: `Unsupported symbol: ${symbol}` });
    return;
  }

  const cachedOverview = getCachedValue(companyOverviewCache, symbol);
  if (cachedOverview) {
    res.json(cachedOverview);
    return;
  }

  if (companyOverviewInFlight.has(symbol)) {
    try {
      const shared = await companyOverviewInFlight.get(symbol);
      res.json(shared);
    } catch (err) {
      res.status(502).json({ error: err?.message || 'Failed to fetch company overview' });
    }
    return;
  }

  const company = getCompanyMeta(symbol);
  const accessIssue = await ensureDataAccess('company_overview');
  if (accessIssue) {
    const cached = quotes[symbol] || null;
    const cachedQuote = cached
      ? {
          symbol: cached.symbol,
          price: cached.price,
          change: null,
          changePercent: cached.changePercent === null ? null : cached.changePercent * 100,
          timestamp: cached.timestamp
        }
      : null;
    res.status(503).json({
      symbol,
      company,
      quote: cachedQuote,
      trade: null,
      availability: { quote: 'unavailable', depth: 'unavailable' },
      warnings: [accessIssue],
      fetchedAt: new Date().toISOString()
    });
    return;
  }

  const overviewPromise = (async () => {
    const [quoteResult, depthResult] = await Promise.allSettled([
      runFyersRequest(fyers => fyers.getQuotes([symbol]), 'company_quote'),
      runFyersRequest(
        fyers => fyers.getMarketDepth({ symbol: [symbol], ohlcv_flag: 1 }),
        'company_depth'
      )
    ]);

    const warnings = [];
    if (quoteResult.status === 'rejected') warnings.push(`Quote failed: ${quoteResult.reason?.message || 'Unknown error'}`);
    if (depthResult.status === 'rejected') warnings.push(`Depth failed: ${depthResult.reason?.message || 'Unknown error'}`);

    const quoteResponse = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
    const depthResponse = depthResult.status === 'fulfilled' ? depthResult.value : null;

    if (quoteResponse?.s && String(quoteResponse.s).toLowerCase() !== 'ok') {
      warnings.push(`Quote response: ${quoteResponse?.message || quoteResponse?.msg || quoteResponse.s}`);
    }
    if (depthResponse?.s && String(depthResponse.s).toLowerCase() !== 'ok') {
      warnings.push(`Depth response: ${depthResponse?.message || depthResponse?.msg || depthResponse.s}`);
    }

    let quote = normalizeQuoteSnapshot(extractQuoteNode(quoteResponse, symbol), symbol);
    if (!quote && quotes[symbol]) {
      const cached = quotes[symbol];
      quote = {
        symbol: cached.symbol,
        price: cached.price,
        change: null,
        changePercent: cached.changePercent === null ? null : cached.changePercent * 100,
        timestamp: cached.timestamp
      };
    }

    const trade = normalizeTradeSnapshot(extractDepthNode(depthResponse, symbol));
    return {
      symbol,
      company,
      quote,
      trade,
      availability: {
        quote: quoteResult.status === 'fulfilled' ? 'ok' : 'error',
        depth: depthResult.status === 'fulfilled' ? 'ok' : 'error'
      },
      warnings,
      fetchedAt: new Date().toISOString()
    };
  })();

  companyOverviewInFlight.set(symbol, overviewPromise);
  try {
    const payload = await overviewPromise;
    if (payload.quote || payload.trade) {
      setCachedValue(companyOverviewCache, symbol, payload, COMPANY_OVERVIEW_CACHE_TTL_MS);
    }
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: err?.message || 'Failed to fetch company overview' });
  } finally {
    companyOverviewInFlight.delete(symbol);
  }
});

app.get('/api/company/:symbol/history', async (req, res) => {
  const symbol = decodeSymbolParam(req.params.symbol);
  if (!symbol) {
    res.status(400).json({ error: 'Missing symbol' });
    return;
  }
  if (!symbols.includes(symbol)) {
    res.status(404).json({ error: `Unsupported symbol: ${symbol}` });
    return;
  }

  const company = getCompanyMeta(symbol);
  const { range, resolution, request } = buildHistoryRequest(symbol, req.query);
  const historyCacheKey = `${symbol}|${range}|${resolution}`;
  const cachedHistory = getCachedValue(companyHistoryCache, historyCacheKey);
  if (cachedHistory) {
    res.json(cachedHistory);
    return;
  }

  if (companyHistoryInFlight.has(historyCacheKey)) {
    try {
      const shared = await companyHistoryInFlight.get(historyCacheKey);
      res.json(shared);
    } catch (err) {
      res.status(502).json({ error: err?.message || 'Failed to fetch history' });
    }
    return;
  }

  const accessIssue = await ensureDataAccess('company_history');

  if (accessIssue) {
    res.status(503).json({
      symbol,
      company,
      range,
      resolution,
      points: [],
      count: 0,
      warning: accessIssue,
      fetchedAt: new Date().toISOString()
    });
    return;
  }

  try {
    const historyPromise = (async () => {
      const historyResponse = await runFyersRequest(
        fyers => fyers.getHistory(request),
        'company_history'
      );
      const points = mapHistoryCandles(historyResponse);
      const warning = (
        historyResponse?.s &&
        String(historyResponse.s).toLowerCase() !== 'ok'
      )
        ? (historyResponse?.message || historyResponse?.msg || historyResponse.s)
        : null;

      return {
        symbol,
        company,
        range,
        resolution,
        points,
        count: points.length,
        warning,
        fetchedAt: new Date().toISOString()
      };
    })();

    companyHistoryInFlight.set(historyCacheKey, historyPromise);
    const payload = await historyPromise;
    setCachedValue(companyHistoryCache, historyCacheKey, payload, COMPANY_HISTORY_CACHE_TTL_MS);
    res.json(payload);
  } catch (err) {
    res.status(502).json({
      symbol,
      company,
      range,
      resolution,
      points: [],
      count: 0,
      error: err?.message || 'Failed to fetch history'
    });
  } finally {
    companyHistoryInFlight.delete(historyCacheKey);
  }
});

// Start FYERS login: redirects user to generate auth code
function startAuth(req, res) {
  if (!ensureAuthConfig(res)) return;
  const state = String(req.query.state || 'power_dashboard');
  const params = new URLSearchParams({
    client_id: FYERS_APP_ID,
    redirect_uri: FYERS_REDIRECT_URI,
    response_type: 'code',
    state
  });
  const url = `${FYERS_AUTH_HOST}/generate-authcode?${params.toString()}`;
  res.redirect(url);
}

// FYERS redirects here with ?auth_code=...
async function handleAuthCallback(req, res) {
  if (!ensureAuthConfig(res)) return;
  const authCode = String(req.query.auth_code || req.query.code || '').trim();
  if (!authCode) {
    const redirectHint = getRedirectMismatchHint(req);
    const queryKeys = Object.keys(req.query || {});
    res.status(400).json({
      error: 'Missing auth_code in callback',
      receivedQueryKeys: queryKeys,
      expectedRedirectUri: FYERS_REDIRECT_URI || null,
      callbackUrl: getIncomingCallbackBaseUrl(req),
      hint: redirectHint || 'Ensure FYERS redirected with auth_code and the callback URI matches exactly.'
    });
    return;
  }

  try {
    const data = await exchangeAuthCode(authCode);
    const callbackToken = (data?.access_token || data?.accessToken || '').trim();
    const callbackRefreshToken = (data?.refresh_token || data?.refreshToken || '').trim();
    if (!callbackToken) {
      res.status(502).json({ error: data?.message || data?.msg || 'No access_token returned by FYERS' });
      return;
    }

    setRuntimeAccessToken(callbackToken);
    if (callbackRefreshToken) setRuntimeRefreshToken(callbackRefreshToken);
    persistRuntimeTokensToEnv();
    await pollAllSymbols();
    res.json({
      status: 'ok',
      message: 'FYERS token stored successfully',
      hasAccessToken: Boolean(tokenManager.getAccessToken()),
      hasRefreshToken: Boolean(tokenManager.getRefreshToken())
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get('/auth/start', startAuth);
app.get('/auth/callback', handleAuthCallback);
app.get('/app/callback', handleAuthCallback);
// Alias routes for API-style auth flow
app.get('/api/fyers/login', startAuth);
app.get('/api/fyers/callback', handleAuthCallback);

// SPA fallback to built index.html (keep after API/auth routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`Server listening on http://${HOST}:${PORT}`));

