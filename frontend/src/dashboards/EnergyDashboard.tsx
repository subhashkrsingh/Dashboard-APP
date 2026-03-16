import { useEnergySector } from "../hooks/useEnergySector";
import { energySectorConfig } from "../lib/sectorConfig";
import { SectorDashboard } from "./SectorDashboard";

interface EnergyDashboardProps {
  onOpenSidebar: () => void;
}

const ENERGY_MARKET_CAP_BY_SYMBOL: Record<string, number> = {
  NTPC: 366915,
  POWERGRID: 307845,
  TATAPOWER: 134650,
  ADANIPOWER: 209130,
  NHPC: 85840
};

const ENERGY_NEWS = [
  {
    headline: "Thermal, transmission, and renewable leaders continue to shape index breadth.",
    source: "NSE Pulse",
    time: "Today"
  },
  {
    headline: "Transmission capex and grid modernization remain in focus for large-cap operators.",
    source: "Street Desk",
    time: "1h ago"
  },
  {
    headline: "Energy demand outlook stays resilient heading into the next high-consumption window.",
    source: "Energy Wire",
    time: "2h ago"
  }
];

export function EnergyDashboard({ onOpenSidebar }: EnergyDashboardProps) {
  const marketData = useEnergySector();

  return (
    <SectorDashboard
      onOpenSidebar={onOpenSidebar}
      dashboardLabel="Energy Sector Dashboard"
      pageTitle="Energy Sector Analytics"
      sectorName="Energy Sector"
      chartTitle="Energy Sector Intraday Trend"
      heatmapDescription="Instant gain/loss map for leading energy companies"
      tableTitle="Energy Stocks Table"
      tableSubtitle="Sorted view for NTPC, Power Grid, Tata Power, Adani Power, NHPC and sector peers"
      marketCapBySymbol={ENERGY_MARKET_CAP_BY_SYMBOL}
      newsTitle="Energy Sector News"
      newsItems={ENERGY_NEWS}
      dataSourceLabel="Data via backend proxy"
      modules={energySectorConfig.modules}
      marketData={marketData}
    />
  );
}
