Power Sector Dashboard - Minimal demo

This scaffold provides a minimal Node + WebSocket backend that polls FYERS for NSE power-sector tickers and a simple frontend that displays live prices and a comparison chart.

Getting started

1. Install dependencies
   - Open terminal
   - cd backend
   - npm install

2. Run
   - npm start
   - Open http://localhost:3000 in your browser

Notes
- Uses the FYERS API v3 SDK (`fyers-api-v3`) for quotes.
- Set `FYERS_APP_ID`, `FYERS_SECRET_ID`, and `FYERS_REDIRECT_URI` in your environment (or `backend/.env`) before running.
- Optional: set `FYERS_ACCESS_TOKEN` for startup convenience. You can also run `/auth/start` once and let `/auth/callback` exchange `auth_code` via `https://api.fyers.in/api/v3/token`.
- Optional: set `FYERS_REFRESH_TOKEN` only if you explicitly enable refresh flow with `FYERS_USE_REFRESH_TOKEN=true`.
- Optional: set `FYERS_AUTH_HOST` (default `https://api.fyers.in/api/v3`) and `FYERS_TOKEN_PATH` (default `/token`) if FYERS account-specific routing differs.
- Symbol format is `NSE:SYMBOL-EQ`. To add symbols, edit `backend/src/index.js` and extend the `symbols` array.
- Optional: set `FYERS_POLL_INTERVAL_MS` to control polling frequency, and `FYERS_DATA_HOST` if you need a different FYERS data host.
- Node 18+ recommended.

Next steps (suggestions)
- Add Redis or in-memory cache and historical storage (TimescaleDB)
- Add auth, watchlists, and compare API endpoints

APIs
- GET /api/quotes - current quotes snapshot
- GET /api/companies - list of companies and basic metadata { symbol, name, sector }
- GET /auth/start - redirect to FYERS login to generate `auth_code`
- GET /auth/callback - exchanges `auth_code`, stores runtime token, and returns auth status JSON
- GET /app/callback - alias of `/auth/callback` for app redirect compatibility

Copyright
- Copyright (c) 2026 Subhash Kumar Singh.
- All rights reserved.
- See `LICENSE` for usage terms.


