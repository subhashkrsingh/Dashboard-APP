import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchPowerSectorData } from "../services/powerSectorApi";
import { useMarketHistory } from "./useMarketHistory";

export function useMarketData() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const query = useQuery({
    queryKey: ["power-sector-dashboard"],
    queryFn: fetchPowerSectorData,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    staleTime: 9500
  });

  const { sectorHistory, companyHistory, signals } = useMarketHistory(query.data);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return {
    ...query,
    sidebarOpen,
    setSidebarOpen,
    sectorHistory,
    companyHistory,
    signals
  };
}
