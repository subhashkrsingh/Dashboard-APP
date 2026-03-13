import { useRealEstateSector } from "../hooks/useRealEstateSector";
import { realEstateSectorConfig } from "../lib/sectorConfig";
import { SectorDashboard } from "./SectorDashboard";

interface RealEstateDashboardProps {
  onOpenSidebar: () => void;
}

const REAL_ESTATE_MARKET_CAP_BY_SYMBOL: Record<string, number> = {
  DLF: 210830,
  GODREJPROP: 90650,
  OBEROIRLTY: 70400,
  PRESTIGE: 69450,
  PHOENIXLTD: 119380
};

const REAL_ESTATE_NEWS = [
  {
    headline: "Developers track strong residential bookings across top metros.",
    source: "Market Bulletin",
    time: "Today"
  },
  {
    headline: "Commercial leasing demand keeps premium mall operators in focus.",
    source: "Realty Desk",
    time: "45m ago"
  },
  {
    headline: "Interest-rate sensitivity remains a key valuation driver for the sector.",
    source: "Broker Watch",
    time: "2h ago"
  }
];

export function RealEstateDashboard({ onOpenSidebar }: RealEstateDashboardProps) {
  const marketData = useRealEstateSector();

  return (
    <SectorDashboard
      onOpenSidebar={onOpenSidebar}
      dashboardLabel="Real Estate Dashboard"
      pageTitle="Real Estate Sector Analytics"
      sectorName="Real Estate Sector"
      chartTitle="Real Estate Sector Intraday Trend"
      heatmapDescription="Performance map for DLF, Godrej Properties, Oberoi Realty, Prestige Estates, and Phoenix Mills"
      tableTitle="Real Estate Stocks Table"
      tableSubtitle="Live analytics for core real estate leaders"
      marketCapBySymbol={REAL_ESTATE_MARKET_CAP_BY_SYMBOL}
      newsTitle="Real Estate Sector News"
      newsItems={REAL_ESTATE_NEWS}
      dataSourceLabel="Live API with fallback snapshot"
      modules={realEstateSectorConfig.modules}
      marketData={marketData}
    />
  );
}
