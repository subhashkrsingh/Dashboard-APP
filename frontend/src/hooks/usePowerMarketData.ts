import { fetchPowerSectorData } from "../services/powerSectorApi";
import { useSectorMarketData } from "./useSectorMarketData";

export function usePowerMarketData() {
  return useSectorMarketData({
    queryKey: ["power-sector-dashboard"],
    queryFn: fetchPowerSectorData
  });
}
