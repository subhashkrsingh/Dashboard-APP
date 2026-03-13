import { useAppLayoutContext } from "../components/AppLayout";
import { SectorDashboard } from "../dashboards/SectorDashboard";
import { usePowerSector } from "../hooks/usePowerSector";
import { powerSectorConfig } from "../lib/sectorConfig";

export function PowerSectorPage() {
  const { onOpenSidebar } = useAppLayoutContext();
  const marketData = usePowerSector();

  return (
    <SectorDashboard
      onOpenSidebar={onOpenSidebar}
      dashboardLabel={powerSectorConfig.dashboardLabel}
      pageTitle="Power Sector Analytics"
      sectorName={powerSectorConfig.sectorName}
      chartTitle={powerSectorConfig.chartTitle}
      heatmapDescription={powerSectorConfig.heatmapDescription}
      tableTitle={powerSectorConfig.tableTitle}
      tableSubtitle={powerSectorConfig.tableSubtitle}
      marketCapBySymbol={powerSectorConfig.marketCapBySymbol}
      newsTitle={powerSectorConfig.newsTitle}
      newsItems={powerSectorConfig.newsItems}
      dataSourceLabel={powerSectorConfig.dataSourceLabel}
      modules={powerSectorConfig.modules}
      marketData={marketData}
    />
  );
}
