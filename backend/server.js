require("dotenv").config();

const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const path = require("path");

const { createSectorRouter, createHealthRouter, createAdminRouter } = require("./routes/routes");
const cacheService = require("./services/swrCacheService");
const { SECTOR_REGISTRY, listApiRoutes } = require("./services/sectorRegistry");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_DIST_PATH = path.join(__dirname, "..", "frontend", "dist");
const serveStaticFrontend =
  process.env.SERVE_STATIC_FRONTEND === "true" || (NODE_ENV === "production" && process.env.SERVE_STATIC_FRONTEND !== "false");

const envOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(item => item.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const STATIC_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://dashboard-app-ten-orpin.vercel.app"
]);

const VERCEL_HOST_PATTERN = /\.vercel\.app$/i;

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = String(origin).trim().replace(/\/+$/, "");
  if (STATIC_ALLOWED_ORIGINS.has(normalizedOrigin) || envOrigins.includes(normalizedOrigin)) {
    return true;
  }

  try {
    const hostname = new URL(normalizedOrigin).hostname;
    return VERCEL_HOST_PATTERN.test(hostname);
  } catch (error) {
    return false;
  }
}

app.disable("x-powered-by");
app.set("etag", false);
app.set("trust proxy", 1);

app.use(
  cors((req, callback) => {
    const requestOrigin = String(req.header("origin") || "").trim().replace(/\/+$/, "") || undefined;
    const originAllowed = isAllowedOrigin(requestOrigin);

    if (originAllowed) {
      return callback(null, {
        origin: true,
        credentials: false
      });
    }

    console.warn("[CORS] Origin denied", {
      requestOrigin,
      allowedOrigins: [...STATIC_ALLOWED_ORIGINS, ...envOrigins]
    });

    return callback(new Error("CORS_ORIGIN_DENIED"));
  })
);

app.use((req, res, next) => {
  res.set("X-App-Env", NODE_ENV);
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

function buildHealthPayload() {
  const cacheStats = cacheService.getCacheStats();

  return {
    status: "ok",
    service: "power-sector-dashboard-api",
    environment: NODE_ENV,
    port: PORT,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    deployment: {
      sameOriginFrontend: serveStaticFrontend,
      allowedOrigins: [...STATIC_ALLOWED_ORIGINS, ...envOrigins],
      vercelPattern: String(VERCEL_HOST_PATTERN)
    },
    cache: {
      size: cacheService.getCacheSize(),
      snapshotTtlMs: cacheService.SNAPSHOT_TTL_MS,
      intradayTtlMs: cacheService.INTRADAY_TTL_MS,
      stats: cacheStats
    },
    sectors: Object.keys(cacheStats)
  };
}

app.get("/health", (_req, res) => {
  res.json(buildHealthPayload());
});

app.get("/api/health", (_req, res) => {
  res.json(buildHealthPayload());
});

app.get("/api", (_req, res) => {
  res.json({
    service: "power-sector-dashboard-api",
    environment: NODE_ENV,
    routes: [
      "/api/health",
      ...listApiRoutes().map(route => `/api${route}`),
      "/api/admin/cache"
    ],
    cache: {
      snapshotTtlMs: cacheService.SNAPSHOT_TTL_MS,
      softRefreshMs: cacheService.SOFT_REFRESH_MS,
      intradayTtlMs: cacheService.INTRADAY_TTL_MS
    }
  });
});

app.use("/api/health", createHealthRouter());
Object.values(SECTOR_REGISTRY).forEach(config => {
  config.routeBases.forEach(base => {
    app.use(`/api${base}`, createSectorRouter(config.key));
  });
});
app.use("/api/admin", createAdminRouter());

if (serveStaticFrontend) {
  app.use(express.static(FRONTEND_DIST_PATH));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }

    return res.sendFile(path.join(FRONTEND_DIST_PATH, "index.html"), error => {
      if (error) {
        next();
      }
    });
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, _req, res, _next) => {
  if (error?.message === "CORS_ORIGIN_DENIED") {
    return res.status(403).json({ error: "Origin not allowed by CORS policy" });
  }
  console.error("Unhandled server error:", error);
  return res.status(500).json({ error: "Internal server error" });
});

async function bootstrap() {
  console.log("[BOOT] Starting backend bootstrap...");
  await cacheService.preloadCache();

  app.listen(PORT, () => {
    console.log(`Power sector dashboard API running on port ${PORT}`);
    console.log("[BOOT] Warm cache ready. SWR cache middleware active.");
  });
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("[BOOT] Startup failed:", error?.message || error);
    process.exit(1);
  });
}

module.exports = app;
