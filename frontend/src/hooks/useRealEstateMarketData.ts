import { fetchRealEstateSectorData } from "../services/realEstateSectorApi";
import { useSectorMarketData } from "./useSectorMarketData";

export function useRealEstateMarketData() {
  return useSectorMarketData({
    queryKey: ["real-estate-sector-dashboard"],
    queryFn: fetchRealEstateSectorData,
    storageKey: "sector-snapshot:real-estate-sector-dashboard:v2"
  });
}
