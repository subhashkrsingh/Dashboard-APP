import { useAppLayoutContext } from "../components/AppLayout";
import { SectorDashboard } from "../dashboards/SectorDashboard";
import { useRealEstateSector } from "../hooks/useRealEstateSector";
import { realEstateSectorConfig } from "../lib/sectorConfig";

export function RealEstatePage() {
  const { onOpenSidebar } = useAppLayoutContext();
  const marketData = useRealEstateSector();

  return (
    <SectorDashboard
      onOpenSidebar={onOpenSidebar}
      dashboardLabel={realEstateSectorConfig.dashboardLabel}
      pageTitle="Real Estate Sector Analytics"
      sectorName={realEstateSectorConfig.sectorName}
      sectorId={realEstateSectorConfig.id}
      chartTitle={realEstateSectorConfig.chartTitle}
      heatmapDescription={realEstateSectorConfig.heatmapDescription}
      tableTitle={realEstateSectorConfig.tableTitle}
      tableSubtitle={realEstateSectorConfig.tableSubtitle}
      marketCapBySymbol={realEstateSectorConfig.marketCapBySymbol}
      newsTitle={realEstateSectorConfig.newsTitle}
      newsItems={realEstateSectorConfig.newsItems}
      dataSourceLabel={realEstateSectorConfig.dataSourceLabel}
      modules={realEstateSectorConfig.modules}
      marketData={marketData}
    />
  );
}
