import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { SectorMarketDataResult } from "../hooks/useSectorMarketData";
import { useSectorMarketData } from "../hooks/useSectorMarketData";
import { fetchEnergySectorData } from "../services/energySectorApi";
import { fetchOilGasSectorData } from "../services/oilGasSectorApi";
import { fetchRealEstateSectorData } from "../services/realEstateSectorApi";

interface SectorDataContextValue {
  energy: SectorMarketDataResult;
  oilGas: SectorMarketDataResult;
  realEstate: SectorMarketDataResult;
}

const SectorDataContext = createContext<SectorDataContextValue | undefined>(undefined);

const ENERGY_SECTOR_STORAGE_KEY = "sector-snapshot:energy-sector:v1";
const OIL_GAS_SECTOR_STORAGE_KEY = "sector-snapshot:oil-gas-sector:v1";
const REAL_ESTATE_STORAGE_KEY = "sector-snapshot:real-estate-sector:v3";

export function SectorDataProvider({ children }: { children: ReactNode }) {
  const energy = useSectorMarketData({
    queryKey: ["energy-sector"],
    queryFn: fetchEnergySectorData,
    storageKey: ENERGY_SECTOR_STORAGE_KEY,
    refetchInterval: 10000,
    staleTime: 9000
  });

  const oilGas = useSectorMarketData({
    queryKey: ["oil-gas-sector"],
    queryFn: fetchOilGasSectorData,
    storageKey: OIL_GAS_SECTOR_STORAGE_KEY,
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
      energy,
      oilGas,
      realEstate
    }),
    [energy, oilGas, realEstate]
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
