require("dotenv").config();

const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const path = require("path");

const { createSectorRouter, createHealthRouter, createAdminRouter } = require("./routes/routes");
const cacheService = require("./services/cacheService");
const { startRefreshScheduler } = require("./services/refreshScheduler");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_DIST_PATH = path.join(__dirname, "..", "frontend", "dist");
const serveStaticFrontend =
  process.env.SERVE_STATIC_FRONTEND === "true" || (NODE_ENV === "production" && process.env.SERVE_STATIC_FRONTEND !== "false");

const allowedOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(item => item.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  cors((req, callback) => {
    const requestOrigin = String(req.header("origin") || "").trim().replace(/\/+$/, "") || undefined;
    const requestHost = req.get("host");
    const requestProtocol = req.header("x-forwarded-proto") || req.protocol;
    const sameOrigin =
      requestOrigin &&
      requestHost &&
      requestOrigin === `${requestProtocol}://${requestHost}`.replace(/\/+$/, "");
    const allowDevelopmentOrigin = NODE_ENV !== "production" && allowedOrigins.length === 0;
    const originAllowed =
      !requestOrigin || sameOrigin || allowDevelopmentOrigin || allowedOrigins.includes(requestOrigin);

    if (originAllowed) {
      return callback(null, {
        origin: true,
        credentials: false
      });
    }

    console.warn("[CORS] Origin denied", {
      requestOrigin,
      allowedOrigins,
      host: requestHost
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
      allowedOrigins
    },
    cache: {
      size: cacheService.getCacheSize(),
      freshMs: cacheService.CACHE_FRESH_MS,
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
      "/api/energy-sector/intraday",
      "/api/oil-gas-sector/intraday",
      "/api/oil-gas/intraday",
      "/api/real-estate-sector/intraday",
      "/api/admin/cache"
    ],
    cache: {
      freshMs: cacheService.CACHE_FRESH_MS
    }
  });
});

app.use("/api/health", createHealthRouter());
app.use("/api/energy-sector", createSectorRouter("energy"));
app.use("/api/oil-gas-sector", createSectorRouter("oilGas"));
app.use("/api/oil-gas", createSectorRouter("oilGas"));
app.use("/api/real-estate-sector", createSectorRouter("realEstate"));
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
  await cacheService.warmAllSectors();
  startRefreshScheduler({
    cacheService,
    sectors: cacheService.SECTORS,
    intervalMs: 60 * 1000
  });

  app.listen(PORT, () => {
    console.log(`Power sector dashboard API running on port ${PORT}`);
    console.log("[BOOT] Warm cache ready. Refresh scheduler started.");
  });
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("[BOOT] Startup failed:", error?.message || error);
    process.exit(1);
  });
}

module.exports = app;
