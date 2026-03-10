# NSE Power Sector Market Dashboard

Production-ready React + Node.js dashboard for live NSE power sector tracking.

## Stack

- Frontend: React (Vite), Axios, Recharts, TailwindCSS, React Query
- Backend: Node.js, Express, Axios, Node Cache, CORS
- Data: NSE public endpoints (no API key)

## Features

- Live `NIFTY POWER` index snapshot
- Major power company table (NTPC, POWERGRID, ADANIPOWER, TATAPOWER, NHPC, TORNTPOWER, JSWENERGY, SJVN, CESC, RPOWER)
- Top gainers and top losers panels
- Live sector chart (polling every 10s)
- Market open/closed indicator
- Sector heatmap
- Real-time row blink when prices update
- Stale fallback when NSE rate-limits

## Project Structure

```text
backend/
  server.js
  routes/powerSector.js
  services/nseService.js

frontend/
  src/components/
    Header.jsx
    SectorSummary.jsx
    PowerTable.jsx
    PowerChart.jsx
    MarketMovers.jsx
    SectorHeatmap.jsx
```

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend runs at `http://localhost:3000`.

### Backend API

- `GET /health`
- `GET /api/power-sector`

Response includes:

- `indexName`
- `lastPrice`
- `percentChange`
- `advanceDecline`
- `topGainers`
- `topLosers`
- `companies`
- `marketStatus`

## Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and calls backend `/api/power-sector`.

## Deployment

### Render (Backend)

- Root: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `PORT=3000` (Render can override)
  - `FRONTEND_ORIGIN=https://<your-vercel-domain>`

### Vercel (Frontend)

- Root: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_API_BASE_URL=https://<your-render-domain>/api`

## Notes

- NSE API is called only from backend (never from frontend).
- Backend maintains NSE cookie session automatically and caches responses for 10 seconds.
- During upstream/rate-limit issues, backend serves last successful snapshot when available.
- If `NIFTY POWER` endpoint data is unavailable, backend automatically falls back to the closest live NSE sector benchmark (`NIFTY ENERGY`) and flags this in response/UI.
