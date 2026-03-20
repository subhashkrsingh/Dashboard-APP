import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { SectorMarketDataResult } from "../hooks/useSectorMarketData";
import { useSectorMarketData } from "../hooks/useSectorMarketData";

interface SectorDataContextValue {
  energy: SectorMarketDataResult;
  oilGas: SectorMarketDataResult;
  realEstate: SectorMarketDataResult;
}

const SectorDataContext = createContext<SectorDataContextValue | undefined>(undefined);

export function SectorDataProvider({ children }: { children: ReactNode }) {
  const energy = useSectorMarketData("energy-sector");
  const oilGas = useSectorMarketData("oil-gas");
  const realEstate = useSectorMarketData("real-estate-sector");

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
