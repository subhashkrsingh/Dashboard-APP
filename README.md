# Power Sector Dashboard

Production-ready sector analytics dashboard for NSE energy, oil and gas, and real estate tracking.

## Architecture

- `backend/`: Express API, NSE proxy layer, cache refreshers, fallback snapshots, health checks
- `frontend/`: React + Vite dashboard, React Query data layer, production UI
- `render.yaml`: single-service deployment config that builds the frontend and serves it from the backend

In production, the recommended setup is:

1. Build `frontend/`
2. Start `backend/`
3. Serve the built SPA and `/api/*` from the same origin

That removes cross-origin issues, avoids frontend rewrite drift, and keeps `VITE_API_BASE_URL=/api`.

## API Endpoints

- `GET /api/health`
- `GET /api/energy-sector`
- `GET /api/energy-sector/intraday`
- `GET /api/oil-gas`
- `GET /api/oil-gas/intraday`
- `GET /api/real-estate-sector`
- `GET /api/real-estate-sector/intraday`

`/api/health` includes cache readiness, fallback availability, last successful refresh age, and deployment mode.

## Local Development

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:3000`.

## Production Deployment

### Render

The repo includes [`render.yaml`](/c:/Users/Subhash%20kumar%20singh/OneDrive/Desktop/Power%20Sector%20Dashboard/render.yaml) for a single web service deployment.

Render will:

- install backend and frontend dependencies
- build the frontend bundle
- start the Express backend
- serve both SPA routes and API routes from one domain

### Required Environment Variables

- `NODE_ENV=production`
- `SERVE_STATIC_FRONTEND=true`
- `PORT` provided by platform

Optional:

- `FRONTEND_ORIGIN` only needed if you intentionally split frontend and backend domains
- `*_CACHE_TTL_SEC` and `*_REFRESH_MS` to tune cache and polling cadence

## Production Notes

- Frontend API calls are centralized through one Axios client.
- Intraday panels now use the same backend contract as the rest of the dashboard.
- SPA routes use `BrowserRouter`, and the backend serves `index.html` fallback in production.
- Each sector route falls back to cached or bundled snapshots when NSE is delayed or blocked.
