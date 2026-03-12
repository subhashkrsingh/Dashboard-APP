export type PriceDirection = "up" | "down" | "flat";

export interface SectorIndex {
  name: string;
  lastPrice: number | null;
  change: number | null;
  percentChange: number | null;
}

export interface CompanyQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  percentChange: number | null;
  volume: number | null;
}

export interface MarketStatus {
  isOpen: boolean;
  label: "OPEN" | "CLOSED" | string;
  timezone: string;
  checkedAt: string;
}

export interface SectorSnapshot {
  sectorIndex: SectorIndex;
  companies: CompanyQuote[];
  gainers: CompanyQuote[];
  losers: CompanyQuote[];
  advanceDecline?: {
    advances: number;
    declines: number;
    unchanged: number;
  };
  marketStatus?: MarketStatus;
  sourceTimestamp?: string;
  fetchedAt: string;
  fallbackIndexUsed?: boolean;
  requestedIndex?: string;
  stale?: boolean;
  warning?: string;
  cached?: boolean;
}

export type PowerSectorResponse = SectorSnapshot;
export type RealEstateSectorResponse = SectorSnapshot;

export interface TimePoint {
  time: string;
  isoTime: string;
  sectorPrice: number;
}
