require("dotenv").config();

const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const path = require("path");

const energySectorRoutes = require("./routes/energySector");
const oilGasSectorRoutes = require("./routes/oilGasSector");
const realEstateSectorRoutes = require("./routes/realEstateSector");
const { getEnergySectorStatus } = require("./services/energySectorStore");
const { startEnergySectorRefresher } = require("./services/energySectorRefresher");
const { getOilGasSectorStatus } = require("./services/oilGasSectorStore");
const { startOilGasSectorRefresher } = require("./services/oilGasSectorRefresher");
const { getRealEstateSectorStatus } = require("./services/realEstateSectorStore");
const { startRealEstateSectorRefresher } = require("./services/realEstateSectorRefresher");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_DIST_PATH = path.join(__dirname, "..", "frontend", "dist");
const serveStaticFrontend =
  process.env.SERVE_STATIC_FRONTEND === "true" || (NODE_ENV === "production" && process.env.SERVE_STATIC_FRONTEND !== "false");

const allowedOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(item => item.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  cors((req, callback) => {
    const requestOrigin = req.header("origin");
    const requestHost = req.get("host");
    const requestProtocol = req.header("x-forwarded-proto") || req.protocol;
    const sameOrigin = requestOrigin && requestHost && requestOrigin === `${requestProtocol}://${requestHost}`;
    const allowDevelopmentOrigin = NODE_ENV !== "production" && allowedOrigins.length === 0;
    const originAllowed =
      !requestOrigin || sameOrigin || allowDevelopmentOrigin || allowedOrigins.includes(requestOrigin);

    if (originAllowed) {
      return callback(null, {
        origin: true,
        credentials: false
      });
    }

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
    sectors: {
      energy: getEnergySectorStatus(),
      oilGas: getOilGasSectorStatus(),
      realEstate: getRealEstateSectorStatus()
    }
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
      "/api/energy-sector",
      "/api/energy-sector/intraday",
      "/api/oil-gas",
      "/api/oil-gas/intraday",
      "/api/real-estate-sector",
      "/api/real-estate-sector/intraday"
    ]
  });
});

startEnergySectorRefresher();
startOilGasSectorRefresher();
startRealEstateSectorRefresher();

app.use("/api/energy-sector", energySectorRoutes);
app.use("/api/oil-gas", oilGasSectorRoutes);
app.use("/api/real-estate-sector", realEstateSectorRoutes);

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

app.listen(PORT, () => {
  console.log(`Power sector dashboard API running on port ${PORT}`);
});

module.exports = app;
