import { useAppLayoutContext } from "../components/AppLayout";
import { SectorDashboard } from "../dashboards/SectorDashboard";
import { useEnergySector } from "../hooks/useEnergySector";
import { energySectorConfig } from "../lib/sectorConfig";

export function EnergySectorPage() {
  const { onOpenSidebar } = useAppLayoutContext();
  const marketData = useEnergySector();

  return (
    <SectorDashboard
      onOpenSidebar={onOpenSidebar}
      dashboardLabel={energySectorConfig.dashboardLabel}
      pageTitle="Energy Sector Analytics"
      sectorName={energySectorConfig.sectorName}
      chartTitle={energySectorConfig.chartTitle}
      heatmapDescription={energySectorConfig.heatmapDescription}
      tableTitle={energySectorConfig.tableTitle}
      tableSubtitle={energySectorConfig.tableSubtitle}
      marketCapBySymbol={energySectorConfig.marketCapBySymbol}
      newsTitle={energySectorConfig.newsTitle}
      newsItems={energySectorConfig.newsItems}
      dataSourceLabel={energySectorConfig.dataSourceLabel}
      modules={energySectorConfig.modules}
      marketData={marketData}
    />
  );
}
