export const SECTOR_IDS = ["energy-sector", "oil-gas", "real-estate-sector"] as const;

export type SectorId = (typeof SECTOR_IDS)[number];

export interface SectorApiConfig {
  id: SectorId;
  sourceLabel: string;
  defaultIndexName: string;
  snapshotPath: `/${string}`;
  intradayPath: `/${string}/intraday`;
  storageKey: string;
  queryKey: readonly ["sector-market", SectorId];
  intradayQueryKey: readonly ["sector-intraday", SectorId];
}

export const SECTOR_API_MAP: Record<SectorId, SectorApiConfig> = {
  "energy-sector": {
    id: "energy-sector",
    sourceLabel: "energy sector",
    defaultIndexName: "NIFTY ENERGY",
    snapshotPath: "/energy-sector",
    intradayPath: "/energy-sector/intraday",
    storageKey: "sector-snapshot:energy-sector:v2",
    queryKey: ["sector-market", "energy-sector"],
    intradayQueryKey: ["sector-intraday", "energy-sector"]
  },
  "oil-gas": {
    id: "oil-gas",
    sourceLabel: "oil & gas sector",
    defaultIndexName: "NIFTY OIL & GAS",
    snapshotPath: "/oil-gas",
    intradayPath: "/oil-gas/intraday",
    storageKey: "sector-snapshot:oil-gas:v2",
    queryKey: ["sector-market", "oil-gas"],
    intradayQueryKey: ["sector-intraday", "oil-gas"]
  },
  "real-estate-sector": {
    id: "real-estate-sector",
    sourceLabel: "real estate sector",
    defaultIndexName: "NIFTY REALTY",
    snapshotPath: "/real-estate-sector",
    intradayPath: "/real-estate-sector/intraday",
    storageKey: "sector-snapshot:real-estate-sector:v4",
    queryKey: ["sector-market", "real-estate-sector"],
    intradayQueryKey: ["sector-intraday", "real-estate-sector"]
  }
};

export function isSectorId(value: unknown): value is SectorId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SECTOR_API_MAP, value);
}

export function getSectorApiConfig(sector: unknown): SectorApiConfig | undefined {
  if (!isSectorId(sector)) {
    return undefined;
  }

  return SECTOR_API_MAP[sector];
}
