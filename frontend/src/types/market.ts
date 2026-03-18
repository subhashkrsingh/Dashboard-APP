export type PriceDirection = "up" | "down" | "flat";
export type SectorDataStatus = "live" | "stale" | "snapshot";
export type SectorReturnWindow = "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "5Y";

export type SectorReturns = Partial<Record<SectorReturnWindow, number | null>>;

export interface SectorIndex {
  name: string;
  lastPrice: number | null;
  change: number | null;
  percentChange: number | null;
  indicativeClose?: number | null;
  previousClose?: number | null;
  open?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  yearHigh?: number | null;
  yearLow?: number | null;
  tradedVolume?: number | null;
  tradedValue?: number | null;
  ffmCap?: number | null;
  pe?: number | null;
  pb?: number | null;
  returns?: SectorReturns;
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
  snapshot?: boolean;
  dataStatus?: SectorDataStatus;
  cacheAgeMs?: number;
  apiCacheStatus?: string;
  lastRefreshError?: {
    code?: string;
    message: string;
    recordedAt?: string;
  };
}

export type EnergySectorResponse = SectorSnapshot;
export type RealEstateSectorResponse = SectorSnapshot;

export interface SectorIntradayResponse {
  time: string[];
  value: number[];
  source?: string;
  fetchedAt: string;
}

export interface TimePoint {
  time: string;
  isoTime: string;
  sectorPrice: number;
}
