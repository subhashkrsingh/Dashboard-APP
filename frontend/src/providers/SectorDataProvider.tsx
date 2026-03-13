import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { SectorMarketDataResult } from "../hooks/useSectorMarketData";
import { useSectorMarketData } from "../hooks/useSectorMarketData";
import { fetchPowerSectorData } from "../services/powerSectorApi";
import { fetchRealEstateSectorData } from "../services/realEstateSectorApi";

interface SectorDataContextValue {
  power: SectorMarketDataResult;
  realEstate: SectorMarketDataResult;
}

const SectorDataContext = createContext<SectorDataContextValue | undefined>(undefined);

const POWER_SECTOR_STORAGE_KEY = "sector-snapshot:power-sector:v3";
const REAL_ESTATE_STORAGE_KEY = "sector-snapshot:real-estate-sector:v3";

export function SectorDataProvider({ children }: { children: ReactNode }) {
  const power = useSectorMarketData({
    queryKey: ["power-sector"],
    queryFn: fetchPowerSectorData,
    storageKey: POWER_SECTOR_STORAGE_KEY,
    refetchInterval: 10000,
    staleTime: 9000
  });

  const realEstate = useSectorMarketData({
    queryKey: ["real-estate-sector"],
    queryFn: fetchRealEstateSectorData,
    storageKey: REAL_ESTATE_STORAGE_KEY,
    refetchInterval: 10000,
    staleTime: 9000
  });

  const value = useMemo(
    () => ({
      power,
      realEstate
    }),
    [power, realEstate]
  );

  return <SectorDataContext.Provider value={value}>{children}</SectorDataContext.Provider>;
}

export function useOptionalSectorDataContext() {
  return useContext(SectorDataContext);
}

export function useSectorDataContext() {
  const context = useOptionalSectorDataContext();

  if (!context) {
    throw new Error("Sector data context is unavailable. Wrap the app with SectorDataProvider.");
  }

  return context;
}
