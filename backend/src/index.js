const express = require('express');
const { fyersModel } = require('fyers-api-v3');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
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

const FYERS_APP_ID = process.env.FYERS_APP_ID || '';
const FYERS_ACCESS_TOKEN = process.env.FYERS_ACCESS_TOKEN || '';
const FYERS_SECRET_ID = process.env.FYERS_SECRET_ID || '';
const FYERS_DATA_HOST = process.env.FYERS_DATA_HOST || 'https://api-t1.fyers.in';
const FYERS_REDIRECT_URI = process.env.FYERS_REDIRECT_URI || '';
const POLL_INTERVAL_MS = Number.parseInt(process.env.FYERS_POLL_INTERVAL_MS, 10) || 12000;
let pollIntervalId = null;
let fyersClient = null;

function getFyersClient() {
  if (!fyersClient) {
    fyersClient = new fyersModel({
      path: __dirname,
      enableLogging: false
    });
    if (FYERS_APP_ID) fyersClient.setAppId(FYERS_APP_ID);
    if (FYERS_REDIRECT_URI) fyersClient.setRedirectUrl(FYERS_REDIRECT_URI);
  }
  if (FYERS_ACCESS_TOKEN) fyersClient.setAccessToken(FYERS_ACCESS_TOKEN);
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

async function fetchFyersQuotes(symbolList) {
  if (!FYERS_APP_ID || !FYERS_ACCESS_TOKEN) {
    console.warn('FYERS_APP_ID or FYERS_ACCESS_TOKEN not set -- cannot fetch quotes');
    symbolList.forEach(symbol => setStatus(symbol, 'no_key', 'API key not set'));
    return [];
  }

  try {
    const fyers = getFyersClient();
    const j = await fyers.getQuotes(symbolList);
    const data = Array.isArray(j?.d) ? j.d : [];

    if (j?.s !== 'ok' && data.length === 0) {
      const msg = j?.message || j?.msg || j?.s || 'Unknown error from FYERS';
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
    console.error('fetch error', err.message);
    symbolList.forEach(symbol => setStatus(symbol, 'error', err.message));
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
