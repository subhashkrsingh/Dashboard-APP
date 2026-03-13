import type { Dispatch, SetStateAction } from "react";
import { useOutletContext } from "react-router-dom";

import type { CompanyHistoryPoint } from "../../hooks/useMarketHistory";
import type { SectorAnalytics } from "../../lib/sectorAnalytics";
import type { SectorConfig } from "../../lib/sectorConfig";
import type { PriceDirection, SectorSnapshot, TimePoint } from "../../types/market";

export interface SectorPageContextValue {
  config: SectorConfig;
  data: SectorSnapshot;
  analytics: SectorAnalytics;
  sectorHistory: TimePoint[];
  companyHistory: Record<string, CompanyHistoryPoint[]>;
  signals: Record<string, PriceDirection>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
}

export function useSectorPageContext() {
  return useOutletContext<SectorPageContextValue>();
}
