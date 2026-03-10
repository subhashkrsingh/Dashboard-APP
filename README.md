# NSE Power Sector Financial Dashboard

Production-grade React + Node.js financial dashboard for NSE power-sector tracking with live polling, animated market UI, and backend-only NSE access.

## Tech Stack

- Frontend: React (Vite), TypeScript, Axios, React Query, Recharts, TailwindCSS, Framer Motion
- Backend: Node.js, Express, Axios, Node Cache, CORS
- Data: NSE public endpoints (no API key)

## Live Features

- MoneyControl/TradingView-style dark dashboard layout
- Infinite top ticker for power-sector stocks
- Animated live sector cards:
  - Sector index
  - Top gainer
  - Top loser
  - Total market volume
- Sortable + searchable power company table
- Real-time green/red flash on price updates
- Intraday live sector line chart (10s polling)
- Company comparison chart (up to 3 companies, price/% growth)
- Market movers panel (gainers + losers)
- Market open/closed indicator
- Sector performance bar
- Loading skeletons + stale-data fallback UI

## Backend API

### GET `/api/power-sector`

Returns:

```json
{
  "sectorIndex": {
    "name": "NIFTY POWER",
    "lastPrice": 0,
    "change": 0,
    "percentChange": 0
  },
  "companies": [
    {
      "symbol": "NTPC",
      "name": "NTPC",
      "price": 0,
      "change": 0,
      "percentChange": 0,
      "volume": 0
    }
  ],
  "gainers": [],
  "losers": [],
  "advanceDecline": {
    "advances": 0,
    "declines": 0,
    "unchanged": 0
  },
  "marketStatus": {
    "isOpen": true,
    "label": "OPEN",
    "timezone": "Asia/Kolkata",
    "checkedAt": "2026-03-10T00:00:00.000Z"
  },
  "fetchedAt": "2026-03-10T00:00:00.000Z"
}
```

- Response cache TTL: **10 seconds**
- If NSE blocks/rate-limits, backend serves latest successful snapshot when available.

## Project Structure

```text
backend/
  server.js
  routes/powerSector.js
  services/nseService.js

frontend/
  src/
    App.tsx
    main.tsx
    components/dashboard/
      HeaderBar.tsx
      SectorCards.tsx
      IntradaySectorChart.tsx
      CompanyComparisonChart.tsx
      CompanyTable.tsx
      MarketMoversPanel.tsx
      PerformanceBar.tsx
      DashboardSkeleton.tsx
    hooks/useMarketHistory.ts
    services/powerSectorApi.ts
    types/market.ts
```

## Local Setup

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Runs on `http://localhost:3000`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:5173`.

## Deployment

### Render (Backend)

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Env:
  - `PORT=3000` (Render may override)
  - `FRONTEND_ORIGIN=https://<your-vercel-domain>`

### Vercel (Frontend)

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Env:
  - `VITE_API_BASE_URL=https://<your-render-domain>/api`

## Notes

- Frontend never calls NSE directly; all traffic goes through backend `/api/power-sector`.
- NSE currently shows endpoint variability; backend keeps `sectorIndices` in flow and uses resilient fallbacks when unavailable.
