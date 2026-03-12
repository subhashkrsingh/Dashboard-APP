import { useQuery } from "@tanstack/react-query";

import type { SectorSnapshot } from "../types/market";
import { useMarketHistory } from "./useMarketHistory";

interface UseSectorMarketDataOptions {
  queryKey: string[];
  queryFn: () => Promise<SectorSnapshot>;
}

export function useSectorMarketData({ queryKey, queryFn }: UseSectorMarketDataOptions) {
  const query = useQuery({
    queryKey,
    queryFn,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    staleTime: 9500
  });

  const { sectorHistory, companyHistory, signals } = useMarketHistory(query.data);

  return {
    ...query,
    sectorHistory,
    companyHistory,
    signals
  };
}
