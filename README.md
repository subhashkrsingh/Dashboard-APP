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
- Set `FYERS_APP_ID`, `FYERS_SECRET_ID`, `FYERS_REDIRECT_URI`, and `FYERS_REFRESH_TOKEN` in your environment (or `backend/.env`) before running.
- Optional: set `FYERS_ACCESS_TOKEN` for initial startup convenience. Backend automatically refreshes access tokens using `FYERS_REFRESH_TOKEN`.
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
- GET /auth/callback - exchanges `auth_code` for access token (returns JSON)


