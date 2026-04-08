import { useAppLayoutContext } from "../components/AppLayout";
import { useEnergySector } from "../hooks/useEnergySector";
import { energySectorConfig } from "../lib/sectorConfig";
import { SectorCompanyPage } from "./SectorCompanyPage";

export function EnergyCompanyPage() {
  const { onOpenSidebar } = useAppLayoutContext();
  const marketData = useEnergySector();

  return <SectorCompanyPage config={energySectorConfig} marketData={marketData} onOpenSidebar={onOpenSidebar} />;
}
