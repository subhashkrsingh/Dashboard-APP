import {
  Activity,
  ArrowUpDown,
  BarChart3,
  Building2,
  LayoutDashboard,
  Lightbulb,
  Newspaper,
  Table2,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SectorModuleId =
  | "overview"
  | "intraday"
  | "performance"
  | "insights"
  | "gainers-losers"
  | "news"
  | "stocks";

export interface SectorNewsItem {
  headline: string;
  source: string;
  time: string;
}

export interface SectorModuleConfig {
  id: SectorModuleId;
  segment: string;
  sectionId: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface SectorConfig {
  id: "energy-sector" | "real-estate";
  label: string;
  dashboardLabel: string;
  basePath: "/energy-sector" | "/real-estate";
  icon: LucideIcon;
  sectorName: string;
  chartTitle: string;
  heatmapDescription: string;
  tableTitle: string;
  tableSubtitle: string;
  newsTitle: string;
  dataSourceLabel: string;
  marketCapBySymbol: Record<string, number>;
  newsItems: SectorNewsItem[];
  modules: SectorModuleConfig[];
}

function buildSectorModules(stocksLabel: string, sectorName: string): SectorModuleConfig[] {
  return [
    {
      id: "overview",
      segment: "",
      sectionId: "overview",
      label: "Overview",
      title: `${sectorName} Overview`,
      description: "Sector snapshot, launchpad links, and key market signals in one place.",
      icon: LayoutDashboard
    },
    {
      id: "intraday",
      segment: "intraday",
      sectionId: "intraday-trend",
      label: "Intraday Trend",
      title: `${sectorName} Intraday Trend`,
      description: "Monitor the live index curve, short-term direction, and intraday benchmark behaviour.",
      icon: Activity
    },
    {
      id: "performance",
      segment: "performance",
      sectionId: "performance",
      label: "Performance",
      title: `${sectorName} Performance`,
      description: "Inspect gain-loss dispersion, breadth, and market-cap concentration across the sector.",
      icon: BarChart3
    },
    {
      id: "insights",
      segment: "insights",
      sectionId: "insights",
      label: "Insights",
      title: `${sectorName} Insights`,
      description: "Review momentum, breadth, volume, and sector-level narrative summaries.",
      icon: Lightbulb
    },
    {
      id: "gainers-losers",
      segment: "gainers-losers",
      sectionId: "movers",
      label: "Gainers / Losers",
      title: `${sectorName} Gainers / Losers`,
      description: "Focus on the strongest and weakest movers driving the session.",
      icon: ArrowUpDown
    },
    {
      id: "news",
      segment: "news",
      sectionId: "news",
      label: "News",
      title: `${sectorName} News`,
      description: "Read curated market headlines and sector updates without leaving the terminal.",
      icon: Newspaper
    },
    {
      id: "stocks",
      segment: "stocks",
      sectionId: "stocks",
      label: stocksLabel,
      title: stocksLabel,
      description: "Scan the full stock table with sorting, search, live pricing, and sparkline context.",
      icon: Table2
    }
  ];
}

export function buildSectorModulePath(basePath: string, segment: string) {
  return segment ? `${basePath}/${segment}` : basePath;
}

export const energySectorConfig: SectorConfig = {
  id: "energy-sector",
  label: "Energy Sector",
  dashboardLabel: "Energy Sector Dashboard",
  basePath: "/energy-sector",
  icon: Zap,
  sectorName: "Energy Sector",
  chartTitle: "Energy Sector Intraday Trend",
  heatmapDescription: "Instant gain/loss map for leading energy companies",
  tableTitle: "Energy Stocks Table",
  tableSubtitle: "Sorted view for NTPC, Power Grid, Tata Power, Adani Power, JSW Energy and sector peers",
  newsTitle: "Energy Sector News",
  dataSourceLabel: "Data via backend proxy",
  marketCapBySymbol: {
    NTPC: 366915,
    POWERGRID: 307845,
    TATAPOWER: 134650,
    ADANIPOWER: 209130,
    NHPC: 85840
  },
  newsItems: [
    {
      headline: "Thermal, transmission, and renewable leaders continue to shape energy index breadth.",
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
  ],
  modules: buildSectorModules("Energy Stocks", "Energy Sector")
};

export const realEstateSectorConfig: SectorConfig = {
  id: "real-estate",
  label: "Real Estate Sector",
  dashboardLabel: "Real Estate Dashboard",
  basePath: "/real-estate",
  icon: Building2,
  sectorName: "Real Estate Sector",
  chartTitle: "Real Estate Sector Intraday Trend",
  heatmapDescription:
    "Performance map for DLF, Godrej Properties, Oberoi Realty, Prestige Estates, and Phoenix Mills",
  tableTitle: "Real Estate Stocks Table",
  tableSubtitle: "Live analytics for the complete NIFTY REALTY universe",
  newsTitle: "Real Estate Sector News",
  dataSourceLabel: "Live API with fallback snapshot",
  marketCapBySymbol: {
    DLF: 210830,
    GODREJPROP: 90650,
    OBEROIRLTY: 70400,
    PRESTIGE: 69450,
    PHOENIXLTD: 119380
  },
  newsItems: [
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
  ],
  modules: buildSectorModules("Realty Stocks", "Real Estate Sector")
};

export const sectorSidebarConfig = [energySectorConfig, realEstateSectorConfig];
