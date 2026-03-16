import { useSectorDataContext } from "../providers/SectorDataProvider";

export function useEnergySector() {
  return useSectorDataContext().energy;
}
