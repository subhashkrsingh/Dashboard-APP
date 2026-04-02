const path = require("path");

const SECTOR_REGISTRY = {
  energy: {
    key: "energy",
    label: "Energy",
    indexName: "NIFTY ENERGY",
    stockIndexNames: ["NIFTY ENERGY"],
    intradayIndexName: "NIFTY ENERGY",
    seedPrice: 24500,
    snapshotPath: path.join(__dirname, "..", "data", "energySectorSnapshot.json"),
    routeBases: ["/energy-sector"]
  },
  banking: {
    key: "banking",
    label: "Banking",
    indexName: "NIFTY BANK",
    stockIndexNames: ["NIFTY BANK"],
    intradayIndexName: "NIFTY BANK",
    seedPrice: 52000,
    snapshotPath: null,
    routeBases: ["/banking-sector", "/banking"]
  },
  auto: {
    key: "auto",
    label: "Auto",
    indexName: "NIFTY AUTO",
    stockIndexNames: ["NIFTY AUTO"],
    intradayIndexName: "NIFTY AUTO",
    seedPrice: 23000,
    snapshotPath: null,
    routeBases: ["/auto-sector", "/auto"]
  },
  fmcg: {
    key: "fmcg",
    label: "FMCG",
    indexName: "NIFTY FMCG",
    stockIndexNames: ["NIFTY FMCG"],
    intradayIndexName: "NIFTY FMCG",
    seedPrice: 56000,
    snapshotPath: null,
    routeBases: ["/fmcg-sector", "/fmcg"]
  },
  it: {
    key: "it",
    label: "IT",
    indexName: "NIFTY IT",
    stockIndexNames: ["NIFTY IT"],
    intradayIndexName: "NIFTY IT",
    seedPrice: 37000,
    snapshotPath: null,
    routeBases: ["/it-sector", "/it"]
  },
  oilGas: {
    key: "oilGas",
    label: "Oil & Gas",
    indexName: "NIFTY OIL & GAS",
    stockIndexNames: ["NIFTY OIL & GAS"],
    intradayIndexName: "NIFTY OIL & GAS",
    seedPrice: 11230,
    snapshotPath: path.join(__dirname, "..", "data", "oilGasSectorSnapshot.json"),
    routeBases: ["/oil-gas-sector", "/oil-gas"]
  },
  realEstate: {
    key: "realEstate",
    label: "Real Estate",
    indexName: "NIFTY REALTY",
    stockIndexNames: ["NIFTY REALTY"],
    intradayIndexName: "NIFTY REALTY",
    seedPrice: 3800,
    snapshotPath: path.join(__dirname, "..", "data", "realEstateSectorSnapshot.json"),
    routeBases: ["/real-estate-sector", "/real-estate"]
  }
};

const CACHE_PRIORITY_SECTORS = ["energy", "banking", "auto", "fmcg", "it"];
const ALL_SECTORS = Object.freeze(Object.keys(SECTOR_REGISTRY));

function getSectorConfig(sector) {
  if (!sector || !Object.prototype.hasOwnProperty.call(SECTOR_REGISTRY, sector)) {
    return null;
  }

  return SECTOR_REGISTRY[sector];
}

function listApiRoutes() {
  return ALL_SECTORS.flatMap(sector => {
    const config = SECTOR_REGISTRY[sector];
    return config.routeBases.flatMap(base => [base, `${base}/intraday`]);
  });
}

module.exports = {
  SECTOR_REGISTRY,
  ALL_SECTORS,
  CACHE_PRIORITY_SECTORS,
  getSectorConfig,
  listApiRoutes
};
