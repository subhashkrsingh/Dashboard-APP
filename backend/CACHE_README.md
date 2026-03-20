# Production-Ready Caching Layer

This implementation provides a Redis-style in-memory cache with advanced features for the Power Sector Dashboard API.

## Architecture

### Core Components

1. **`cacheService.js`** - Core caching logic with TTL, stale-while-revalidate, and background refresh
2. **`fetchService.js`** - NSE data fetching with proper error handling and timeouts
3. **`routes.js`** - API endpoints using the caching layer

### Cache Behavior

```
API Request → Check Cache → Return if Fresh
                        ↓
                 Return Stale + Background Refresh
                        ↓
                 Return Last Successful Snapshot
```

## API Endpoints

### Sector Data
- `GET /api/energy-sector` - Energy sector data
- `GET /api/oil-gas` - Oil & Gas sector data
- `GET /api/real-estate-sector` - Real Estate sector data

### Intraday Charts
- `GET /api/energy-sector/intraday` - Energy intraday (NSE → Synthetic fallback)
- `GET /api/oil-gas/intraday` - Oil & Gas intraday
- `GET /api/real-estate-sector/intraday` - Real Estate intraday

### Manual Refresh
- `POST /api/energy-sector/refresh` - Trigger manual refresh
- `POST /api/oil-gas/refresh` - Trigger manual refresh
- `POST /api/real-estate-sector/refresh` - Trigger manual refresh

### Health & Admin
- `GET /api/health` - Health check with cache statistics
- `GET /api/admin/cache` - Detailed cache statistics
- `DELETE /api/admin/cache/:sector` - Clear specific cache
- `DELETE /api/admin/cache` - Clear all caches

## Cache Configuration

Set via environment variables:

```bash
CACHE_TTL_MS=120000                    # 2 minutes
CACHE_STALE_WHILE_REVALIDATE_MS=300000  # 5 minutes
NSE_REQUEST_TIMEOUT_MS=60000           # 60 seconds
NSE_INTRADAY_TIMEOUT_MS=8000           # 8 seconds
```

## Response Format

All responses include cache metadata:

```json
{
  "sectorIndex": { ... },
  "stocks": [ ... ],
  "fetchedAt": "2024-01-01T10:00:00.000Z",
  "_cache": {
    "status": "fresh|stale|miss",
    "ageMs": 45000,
    "lastUpdated": "2024-01-01T10:00:00.000Z",
    "warning": "Data may be stale, refresh in progress"
  }
}
```

## Cache Headers

- `X-Cache-Status`: FRESH|STALE|MISS
- `X-Cache-Age`: Age in milliseconds
- `X-Response-Time`: Response time in milliseconds

## Performance Characteristics

- **Fresh Cache**: <50ms response time
- **Stale Cache**: <50ms + background refresh
- **Cache Miss**: <200ms (with stale data) + background refresh
- **No Data**: 503 error with retry guidance

## Error Handling

- **Never returns 500** due to data fetch failures
- **Always returns last known data** when available
- **Graceful degradation** to synthetic data for intraday
- **Timeout protection** prevents hanging requests

## Logging

Cache operations are logged:
```
[CACHE] HIT for energy
[CACHE] MISS for energy
[CACHE] STALE for energy
[CACHE] REFRESH START for energy
[CACHE] REFRESH SUCCESS for energy (1250ms)
[CACHE] REFRESH ERROR for energy: timeout (8000ms)
```

## Migration Path

The system maintains backward compatibility:

1. **New endpoints**: `/api/energy-sector`, `/api/oil-gas`, `/api/real-estate-sector`
2. **Legacy endpoints**: `/api/energy-sector-legacy`, `/api/oil-gas-legacy`, `/api/real-estate-sector-legacy`
3. **Gradual migration**: Update frontend to use new endpoints
4. **Remove legacy**: Once frontend migrated, remove legacy routes

## Testing

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Cache Stats
```bash
curl http://localhost:3000/api/admin/cache
```

### Manual Refresh
```bash
curl -X POST http://localhost:3000/api/energy-sector/refresh
```

### Performance Test
```bash
# Fresh cache (should be <50ms)
curl -H "Cache-Control: no-cache" http://localhost:3000/api/energy-sector

# Stale cache (should return stale + trigger refresh)
# Wait 2+ minutes, then request again
```

## Production Deployment

1. **Environment Variables**:
   ```bash
   NODE_ENV=production
   CACHE_TTL_MS=120000
   CACHE_STALE_WHILE_REVALIDATE_MS=300000
   NSE_REQUEST_TIMEOUT_MS=30000
   ```

2. **Monitoring**: Watch logs for cache hit rates and refresh success rates

3. **Scaling**: Single instance works well; for multi-instance, consider Redis

4. **Backup**: Cache auto-recovers from NSE failures using lastSuccessfulSnapshot