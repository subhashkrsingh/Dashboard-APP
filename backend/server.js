require("dotenv").config();

const cors = require("cors");
const express = require("express");
const morgan = require("morgan");

const energySectorRoutes = require("./routes/energySector");
const realEstateSectorRoutes = require("./routes/realEstateSector");
const { startEnergySectorRefresher } = require("./services/energySectorRefresher");
const { startRealEstateSectorRefresher } = require("./services/realEstateSectorRefresher");

const app = express();

const allowedOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(item => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS_ORIGIN_DENIED"));
    }
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "energy-sector-backend",
    timestamp: new Date().toISOString()
  });
});

startEnergySectorRefresher();
startRealEstateSectorRefresher();

app.use("/api/energy-sector", energySectorRoutes);
app.use("/api/real-estate-sector", realEstateSectorRoutes);

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

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Energy sector API running on port ${PORT}`);
});

module.exports = app;
