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
  'NSE:RENEW-EQ',
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
  { symbol: 'NSE:RENEW-EQ', name: 'ReNew Energy Global plc', sector: 'Renewables' },
  { symbol: 'NSE:RPOWER-EQ', name: 'Reliance Power Limited', sector: 'Power Generation' }
];

let quotes = {};
const symbolStatus = {}; // symbol -> { status, message, updatedAt }

const env = key => (process.env[key] || '').trim();

const FYERS_APP_ID = env('FYERS_APP_ID');
const INITIAL_ACCESS_TOKEN = env('FYERS_ACCESS_TOKEN');
const INITIAL_REFRESH_TOKEN = env('FYERS_REFRESH_TOKEN');
const FYERS_SECRET_ID = env('FYERS_SECRET_ID');
const FYERS_DATA_HOST = env('FYERS_DATA_HOST') || 'https://api-t1.fyers.in';
const FYERS_REDIRECT_URI = env('FYERS_REDIRECT_URI');
const FYERS_AUTH_HOST = (env('FYERS_AUTH_HOST') || 'https://api-t1.fyers.in/api/v3').replace(/\/+$/, '');
const FYERS_PIN = env('FYERS_PIN');
const POLL_INTERVAL_MS = Number.parseInt(process.env.FYERS_POLL_INTERVAL_MS, 10) || 12000;
const REFRESH_BEFORE_SEC = Number.parseInt(process.env.FYERS_REFRESH_BEFORE_SEC, 10) || 300;
const REFRESH_BEFORE_MS = Math.max(60, REFRESH_BEFORE_SEC) * 1000;
const FYERS_PERSIST_AUTH_TO_ENV = env('FYERS_PERSIST_AUTH_TO_ENV') === 'true';
let pollIntervalId = null;
let fyersClient = null;
let refreshInFlight = null;

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

    const response = await fetch(`${FYERS_AUTH_HOST}/validate-refresh-token`, {
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
    if (!response.ok || !refreshedAccessToken) {
      const reasonText = data?.message || data?.msg || `HTTP ${response.status}`;
      throw new Error(reasonText);
    }

    setRuntimeAccessToken(refreshedAccessToken);
    if (refreshedRefreshToken) setRuntimeRefreshToken(refreshedRefreshToken);
    persistRuntimeTokensToEnv();
    console.log(`FYERS access token refreshed (${reason})`);
    return true;
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

async function fetchFyersQuotes(symbolList, options = {}) {
  const attemptedRefresh = options.attemptedRefresh === true;
  const accessToken = tokenManager.getAccessToken();
  const refreshToken = tokenManager.getRefreshToken();
  const hasRefreshToken = Boolean(refreshToken);

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
      : (hasRefreshToken ? 'FYERS access token unavailable (refresh failed)' : 'FYERS_ACCESS_TOKEN not set');
    console.warn(`${missing} -- cannot fetch quotes`);
    symbolList.forEach(symbol => setStatus(symbol, 'no_key', missing));
    return [];
  }

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
      error: 'Missing FYERS_APP_ID, FYERS_SECRET_ID, or FYERS_REDIRECT_URI'
    });
    return false;
  }
  return true;
}

function broadcastQuotes() {
  const payload = JSON.stringify({ type: 'quotes', data: Object.values(quotes) });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

async function pollAllSymbols() {
  const data = await fetchFyersQuotes(symbols);
  if (data.length === 0) return;
  data.forEach(q => {
    quotes[q.symbol] = q;
  });
  broadcastQuotes();
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

// Start FYERS login: redirects user to generate auth code (API v3 SDK)
function startAuth(req, res) {
  if (!ensureAuthConfig(res)) return;
  const fyers = getFyersClient();
  const url = fyers.generateAuthCode();
  res.redirect(url);
}

// FYERS redirects here with ?auth_code=...
async function handleAuthCallback(req, res) {
  if (!ensureAuthConfig(res)) return;
  console.log('Callback URL:', req.url);
  console.log('Query:', req.query);
  const authCode = req.query.auth_code;
  if (!authCode) {
    res.status(400).json({ error: 'Missing auth_code in callback' });
    return;
  }

  try {
    const fyers = getFyersClient();
    const data = await fyers.generate_access_token({
      client_id: FYERS_APP_ID,
      secret_key: FYERS_SECRET_ID,
      auth_code: authCode
    });
    const callbackToken = (data?.access_token || data?.accessToken || '').trim();
    const callbackRefreshToken = (data?.refresh_token || data?.refreshToken || '').trim();
    if (callbackToken) {
      setRuntimeAccessToken(callbackToken);
      if (callbackRefreshToken) setRuntimeRefreshToken(callbackRefreshToken);
      persistRuntimeTokensToEnv();
      await pollAllSymbols();
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get('/auth/start', startAuth);
app.get('/auth/callback', handleAuthCallback);
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
