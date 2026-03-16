import { useSectorDataContext } from "../providers/SectorDataProvider";

export function useOilGasSector() {
  return useSectorDataContext().oilGas;
}
