import { useAppLayoutContext } from "../components/AppLayout";
import { useOilGasSector } from "../hooks/useOilGasSector";
import { oilGasSectorConfig } from "../lib/sectorConfig";
import { SectorCompanyPage } from "./SectorCompanyPage";

export function OilGasCompanyPage() {
  const { onOpenSidebar } = useAppLayoutContext();
  const marketData = useOilGasSector();

  return <SectorCompanyPage config={oilGasSectorConfig} marketData={marketData} onOpenSidebar={onOpenSidebar} />;
}
