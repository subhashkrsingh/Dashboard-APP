import { useSectorMarketData } from "./useSectorMarketData";

export function useEnergySector() {
  return useSectorMarketData("energy-sector");
}
