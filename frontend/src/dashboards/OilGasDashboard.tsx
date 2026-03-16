import { useAppLayoutContext } from "../components/AppLayout";
import { SectorDashboard } from "./SectorDashboard";
import { useOilGasSector } from "../hooks/useOilGasSector";
import { oilGasSectorConfig } from "../lib/sectorConfig";

export function OilGasDashboard() {
  const { onOpenSidebar } = useAppLayoutContext();
  const marketData = useOilGasSector();

  return (
    <SectorDashboard
      onOpenSidebar={onOpenSidebar}
      dashboardLabel={oilGasSectorConfig.dashboardLabel}
      pageTitle="Oil & Gas Sector Analytics"
      sectorName={oilGasSectorConfig.sectorName}
      sectorId={oilGasSectorConfig.id}
      chartTitle={oilGasSectorConfig.chartTitle}
      heatmapDescription={oilGasSectorConfig.heatmapDescription}
      tableTitle={oilGasSectorConfig.tableTitle}
      tableSubtitle={oilGasSectorConfig.tableSubtitle}
      marketCapBySymbol={oilGasSectorConfig.marketCapBySymbol}
      newsTitle={oilGasSectorConfig.newsTitle}
      newsItems={oilGasSectorConfig.newsItems}
      dataSourceLabel={oilGasSectorConfig.dataSourceLabel}
      modules={oilGasSectorConfig.modules}
      marketData={marketData}
    />
  );
}
