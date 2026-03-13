import { useSectorDataContext } from "../providers/SectorDataProvider";

export function usePowerSector() {
  return useSectorDataContext().power;
}
