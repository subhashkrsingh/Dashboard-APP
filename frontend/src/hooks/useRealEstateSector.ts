import { useSectorDataContext } from "../providers/SectorDataProvider";

export function useRealEstateSector() {
  return useSectorDataContext().realEstate;
}
