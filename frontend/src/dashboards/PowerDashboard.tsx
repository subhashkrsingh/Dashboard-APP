import { usePowerMarketData } from "../hooks/usePowerMarketData";
import { SectorDashboard } from "./SectorDashboard";

interface PowerDashboardProps {
  onOpenSidebar: () => void;
}

const POWER_MARKET_CAP_BY_SYMBOL: Record<string, number> = {
  NTPC: 366915,
  POWERGRID: 307845,
  TATAPOWER: 134650,
  ADANIPOWER: 209130,
  NHPC: 85840
};

const POWER_NEWS = [
  {
    headline: "Thermal and hydro utilities continue to anchor index breadth.",
    source: "NSE Pulse",
    time: "Today"
  },
  {
    headline: "Transmission capex cycle remains in focus for large-cap operators.",
    source: "Street Desk",
    time: "1h ago"
  },
  {
    headline: "Power demand outlook stays resilient into summer consumption window.",
    source: "Energy Wire",
    time: "2h ago"
  }
];

export function PowerDashboard({ onOpenSidebar }: PowerDashboardProps) {
  const marketData = usePowerMarketData();

  return (
    <SectorDashboard
      onOpenSidebar={onOpenSidebar}
      dashboardLabel="Power Sector Dashboard"
      pageTitle="Power Sector Analytics"
      sectorName="Power Sector"
      chartTitle="Power Sector Intraday Trend"
      heatmapDescription="Instant gain/loss map for leading power companies"
      tableTitle="Power Stocks Table"
      tableSubtitle="Sorted view for NTPC, Power Grid, Tata Power, Adani Power, NHPC and peers"
      marketCapBySymbol={POWER_MARKET_CAP_BY_SYMBOL}
      newsTitle="Power Sector News"
      newsItems={POWER_NEWS}
      dataSourceLabel="Data via backend proxy"
      marketData={marketData}
    />
  );
}
