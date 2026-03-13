import { useEffect, useState } from "react";

import { usePowerSector } from "./usePowerSector";

export function useMarketData() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const marketData = usePowerSector();

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
