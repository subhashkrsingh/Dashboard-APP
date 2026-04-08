import { useAppLayoutContext } from "../components/AppLayout";
import { useRealEstateSector } from "../hooks/useRealEstateSector";
import { realEstateSectorConfig } from "../lib/sectorConfig";
import { SectorCompanyPage } from "./SectorCompanyPage";

export function RealEstateCompanyPage() {
  const { onOpenSidebar } = useAppLayoutContext();
  const marketData = useRealEstateSector();

  return <SectorCompanyPage config={realEstateSectorConfig} marketData={marketData} onOpenSidebar={onOpenSidebar} />;
}
