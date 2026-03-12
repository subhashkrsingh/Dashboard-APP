import { useState } from "react";
import { Activity, BarChart3, TrendingDown, TrendingUp } from "lucide-react";

import { InsightsPanel } from "../components/cards/InsightsPanel";
import { MarketCapOverview } from "../components/cards/MarketCapOverview";
import { MarketCard } from "../components/cards/MarketCard";
import { SectorCard } from "../components/cards/SectorCard";
import { SectorNewsPanel } from "../components/cards/SectorNewsPanel";
import { TopMoversPanel } from "../components/cards/TopMoversPanel";
import { PerformanceChart } from "../components/charts/PerformanceChart";
import { SectorChart } from "../components/charts/SectorChart";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";
import { FooterBar } from "../components/dashboard/FooterBar";
import { Navbar } from "../components/Navbar";
import { StockTable } from "../components/tables/StockTable";
import type { CompanyHistoryPoint } from "../hooks/useMarketHistory";
import { formatPercent, formatPrice, formatVolume } from "../lib/formatters";
import type { CompanyQuote, PriceDirection, SectorSnapshot, TimePoint } from "../types/market";

interface SectorNewsItem {
  headline: string;
  source: string;
  time: string;
}

interface SectorDashboardData {
  data?: SectorSnapshot;
  error: unknown;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
  sectorHistory: TimePoint[];
  companyHistory: Record<string, CompanyHistoryPoint[]>;
  signals: Record<string, PriceDirection>;
}

interface SectorDashboardProps {
  onOpenSidebar: () => void;
  dashboardLabel: string;
  pageTitle: string;
  sectorName: string;
  chartTitle: string;
  heatmapDescription: string;
  tableTitle: string;
  tableSubtitle?: string;
  marketCapBySymbol: Record<string, number>;
  newsTitle: string;
  newsItems: SectorNewsItem[];
  dataSourceLabel?: string;
  marketData: SectorDashboardData;
}

function getTopByPercent(companies: CompanyQuote[], direction: "max" | "min") {
  const sorted = [...companies].sort((a, b) => {
    const aValue = Number.isFinite(a.percentChange) ? Number(a.percentChange) : 0;
    const bValue = Number.isFinite(b.percentChange) ? Number(b.percentChange) : 0;
    return direction === "max" ? bValue - aValue : aValue - bValue;
  });
  return sorted[0];
}

export function SectorDashboard({
  onOpenSidebar,
  dashboardLabel,
  pageTitle,
  sectorName,
  chartTitle,
  heatmapDescription,
  tableTitle,
  tableSubtitle,
  marketCapBySymbol,
  newsTitle,
  newsItems,
  dataSourceLabel = "Data via backend proxy",
  marketData
}: SectorDashboardProps) {
  const [search, setSearch] = useState("");
  const { data, error, isLoading, isFetching, refetch, sectorHistory, companyHistory, signals } = marketData;

  const fallbackCompanies = data?.companies ?? [];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Navbar
        companies={fallbackCompanies}
        marketStatus={data?.marketStatus}
        fetchedAt={data?.fetchedAt}
        isFetching={isFetching}
        search={search}
        onSearchChange={setSearch}
        onOpenSidebar={onOpenSidebar}
      />

      <div className="space-y-4 px-4 py-4 md:px-6">
        <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-600">{dashboardLabel}</p>
          <div className="mt-2 flex items-center gap-3">
            <Activity className="h-5 w-5 text-blue-600" />
            <h1 className="font-display text-2xl font-semibold text-slate-900">{pageTitle}</h1>
          </div>
        </section>

        {isLoading ? <DashboardSkeleton /> : null}

        {!isLoading && (!data || error) ? (
          <section className="glass-card rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <h2 className="font-display text-2xl text-rose-700">{sectorName} data unavailable</h2>
            <p className="mt-2 text-sm text-rose-700/90">
              {error instanceof Error ? error.message : "Failed to load market data"}
            </p>
            <button
              type="button"
              className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </section>
        ) : null}

        {!isLoading && data ? (
          <>
            {data.stale ? (
              <section className="glass-card rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {data.warning ?? "Using cached snapshot while the live feed is temporarily restricted."}
              </section>
            ) : null}

            {data.fallbackIndexUsed ? (
              <section className="glass-card rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Requested index {data.requestedIndex ?? "NSE index"} was unavailable. Showing closest live benchmark
                from feed.
              </section>
            ) : null}

            <DashboardContent
              data={data}
              search={search}
              sectorName={sectorName}
              chartTitle={chartTitle}
              heatmapDescription={heatmapDescription}
              tableTitle={tableTitle}
              tableSubtitle={tableSubtitle}
              sectorHistory={sectorHistory}
              companyHistory={companyHistory}
              signals={signals}
              marketCapBySymbol={marketCapBySymbol}
              newsTitle={newsTitle}
              newsItems={newsItems}
            />
          </>
        ) : null}

        <FooterBar productLabel={dashboardLabel} dataSourceLabel={dataSourceLabel} />
      </div>
    </div>
  );
}

interface DashboardContentProps {
  data: SectorSnapshot;
  search: string;
  sectorName: string;
  chartTitle: string;
  heatmapDescription: string;
  tableTitle: string;
  tableSubtitle?: string;
  sectorHistory: TimePoint[];
  companyHistory: Record<string, CompanyHistoryPoint[]>;
  signals: Record<string, PriceDirection>;
  marketCapBySymbol: Record<string, number>;
  newsTitle: string;
  newsItems: SectorNewsItem[];
}

function DashboardContent({
  data,
  search,
  sectorName,
  chartTitle,
  heatmapDescription,
  tableTitle,
  tableSubtitle,
  sectorHistory,
  companyHistory,
  signals,
  marketCapBySymbol,
  newsTitle,
  newsItems
}: DashboardContentProps) {
  const fallbackTopGainer = getTopByPercent(data.companies, "max");
  const fallbackTopLoser = getTopByPercent(data.companies, "min");
  const topGainer = data.gainers[0] ?? fallbackTopGainer;
  const topLoser = data.losers[0] ?? fallbackTopLoser;
  const volumeLeader = [...data.companies].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];
  const totalVolume = data.companies.reduce((sum, company) => sum + (company.volume ?? 0), 0);
  const averageChange = data.companies.length
    ? data.companies.reduce((sum, company) => sum + (company.percentChange ?? 0), 0) / data.companies.length
    : 0;
  const advances =
    data.advanceDecline?.advances ?? data.companies.filter(company => (company.percentChange ?? 0) > 0).length;
  const declines =
    data.advanceDecline?.declines ?? data.companies.filter(company => (company.percentChange ?? 0) < 0).length;

  return (
    <section className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <SectorCard sectorIndex={data.sectorIndex} signal={signals.__sector} />

        <MarketCard
          title="Top Gainer"
          value={topGainer?.symbol ?? "--"}
          subtitle={formatPrice(topGainer?.price)}
          change={topGainer?.percentChange}
          icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
          tone="positive"
          signal={topGainer ? signals[topGainer.symbol] : undefined}
        />

        <MarketCard
          title="Top Loser"
          value={topLoser?.symbol ?? "--"}
          subtitle={formatPrice(topLoser?.price)}
          change={topLoser?.percentChange}
          icon={<TrendingDown className="h-3.5 w-3.5 text-rose-600" />}
          tone="negative"
          signal={topLoser ? signals[topLoser.symbol] : undefined}
        />

        <MarketCard
          title="Volume Leader"
          value={volumeLeader?.symbol ?? "--"}
          subtitle={formatVolume(volumeLeader?.volume)}
          change={volumeLeader?.percentChange}
          icon={<BarChart3 className="h-3.5 w-3.5 text-blue-600" />}
          tone="accent"
          signal={volumeLeader ? signals[volumeLeader.symbol] : undefined}
        />
      </section>

      <SectorChart
        sectorIndex={data.sectorIndex}
        history={sectorHistory}
        title={chartTitle}
        subtitle={`Live movement of ${data.sectorIndex.name || sectorName.toUpperCase()}`}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
        <PerformanceChart
          companies={data.companies}
          title={`${sectorName} Performance`}
          description={heatmapDescription}
        />
        <div className="space-y-4">
          <InsightsPanel
            sectorSpot={data.sectorIndex.lastPrice}
            averageChange={averageChange}
            advances={advances}
            declines={declines}
            totalVolume={totalVolume}
            volumeLeaderSymbol={volumeLeader?.symbol}
            compact
            sectorName={sectorName}
          />
          <MarketCapOverview companies={data.companies} marketCapBySymbol={marketCapBySymbol} sectorName={sectorName} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <TopMoversPanel gainers={data.gainers} losers={data.losers} />
        <SectorNewsPanel title={newsTitle} items={newsItems} />
      </section>

      <StockTable
        companies={data.companies}
        historyBySymbol={companyHistory}
        signals={signals}
        query={search}
        title={tableTitle}
        subtitle={tableSubtitle}
      />
    </section>
  );
}
