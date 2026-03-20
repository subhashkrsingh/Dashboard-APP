import { useSectorMarketData } from "./useSectorMarketData";

export function useOilGasSector() {
  return useSectorMarketData("oil-gas");
}
