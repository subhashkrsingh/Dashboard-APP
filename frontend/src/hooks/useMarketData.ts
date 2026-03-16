import { useEffect, useState } from "react";

import { useEnergySector } from "./useEnergySector";

export function useMarketData() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const marketData = useEnergySector();

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
    ...marketData,
    sidebarOpen,
    setSidebarOpen
  };
}
