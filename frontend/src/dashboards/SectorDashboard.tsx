import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

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
import type { SectorMarketDataResult } from "../hooks/useSectorMarketData";
import { formatClock, formatPercent, formatPrice, formatVolume } from "../lib/formatters";
import type { SectorModuleConfig } from "../lib/sectorConfig";
import type { CompanyQuote, PriceDirection, SectorSnapshot, TimePoint } from "../types/market";

interface SectorNewsItem {
  headline: string;
  source: string;
  time: string;
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
  modules: SectorModuleConfig[];
  marketData: SectorMarketDataResult;
}

const SECTION_HIGHLIGHT_CLASSES = ["ring-2", "ring-cyan-400", "ring-offset-2", "ring-offset-[#F5F7FB]"];
const SECTION_WRAPPER_CLASS = "scroll-mt-36 rounded-[28px] transition-[box-shadow] duration-300";

function pulseSectionHighlight(sectionId: string) {
  const section = document.getElementById(sectionId);
  if (!section) return false;

  section.classList.add(...SECTION_HIGHLIGHT_CLASSES);
  window.setTimeout(() => {
    section.classList.remove(...SECTION_HIGHLIGHT_CLASSES);
  }, 1600);

  return true;
}

function getTopByPercent(companies: CompanyQuote[], direction: "max" | "min") {
  const sorted = [...companies].sort((a, b) => {
    const aValue = Number.isFinite(a.percentChange) ? Number(a.percentChange) : 0;
    const bValue = Number.isFinite(b.percentChange) ? Number(b.percentChange) : 0;
    return direction === "max" ? bValue - aValue : aValue - bValue;
  });
  return sorted[0];
}

function RefreshDiagnostics({
  apiCacheStatus,
  lastRefreshError,
  tone
}: {
  apiCacheStatus?: string;
  lastRefreshError?: SectorSnapshot["lastRefreshError"];
  tone: "amber" | "rose" | "blue";
}) {
  if (!apiCacheStatus && !lastRefreshError) {
    return null;
  }

  const toneClass =
    tone === "amber"
      ? "border-amber-300/70 bg-white/70 text-amber-900"
      : tone === "rose"
      ? "border-rose-300/70 bg-white/70 text-rose-900"
      : "border-blue-300/70 bg-white/70 text-blue-900";

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${toneClass}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {apiCacheStatus ? <span className="font-semibold">API {apiCacheStatus}</span> : null}
        {lastRefreshError?.code ? <span>Code: {lastRefreshError.code}</span> : null}
        {lastRefreshError?.recordedAt ? <span>At: {formatClock(lastRefreshError.recordedAt)}</span> : null}
      </div>
      {lastRefreshError?.message ? <p className="mt-1 leading-5">{lastRefreshError.message}</p> : null}
    </div>
  );
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
  modules,
  marketData
}: SectorDashboardProps) {
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { data, error, isLoading, isFetching, refetch, sectorHistory, companyHistory, signals } = marketData;
  const blockingError = !data && error;
  const scrollableModules = useMemo(() => modules.filter(module => module.id !== "overview"), [modules]);

  useEffect(() => {
    if (isLoading || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(location.search);
    const requestedSection = params.get("section");
    const pathParts = location.pathname.split("/").filter(Boolean);
    const finalSegment = pathParts[pathParts.length - 1];
    const legacyModule = scrollableModules.find(module => module.segment && module.segment === finalSegment);
    const targetSectionId = requestedSection || legacyModule?.sectionId;

    if (!targetSectionId) {
      return;
    }

    let attempts = 0;
    let timeoutId: number | null = null;

    const scrollToTarget = () => {
      const section = document.getElementById(targetSectionId);

      if (!section) {
        if (attempts < 20) {
          attempts += 1;
          timeoutId = window.setTimeout(scrollToTarget, 120);
        }
        return;
      }

      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      pulseSectionHighlight(targetSectionId);

      if (requestedSection) {
        navigate(location.pathname, { replace: true });
      }
    };

    scrollToTarget();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isLoading, location.pathname, location.search, navigate, scrollableModules]);

  const fallbackCompanies = data?.companies ?? [];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Navbar
        companies={fallbackCompanies}
        marketStatus={data?.marketStatus}
        fetchedAt={data?.fetchedAt}
        isFetching={isFetching}
        dataStatus={data?.dataStatus}
        cacheAgeMs={data?.cacheAgeMs}
        apiCacheStatus={data?.apiCacheStatus}
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

        {!isLoading && blockingError ? (
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
            {data.dataStatus === "snapshot" ? (
              <section className="glass-card rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {data.warning ?? "Showing bundled or saved snapshot while live market feeds are unavailable."}
                <RefreshDiagnostics
                  apiCacheStatus={data.apiCacheStatus}
                  lastRefreshError={data.lastRefreshError}
                  tone="rose"
                />
              </section>
            ) : null}

            {data.stale && data.dataStatus !== "snapshot" ? (
              <section className="glass-card rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {data.warning ?? "Using cached snapshot while the live feed is temporarily restricted."}
                <RefreshDiagnostics
                  apiCacheStatus={data.apiCacheStatus}
                  lastRefreshError={data.lastRefreshError}
                  tone="amber"
                />
              </section>
            ) : null}

            {data.fallbackIndexUsed ? (
              <section className="glass-card rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Requested index {data.requestedIndex ?? "NSE index"} was unavailable. Showing closest live benchmark
                from feed.
                <RefreshDiagnostics apiCacheStatus={data.apiCacheStatus} tone="blue" />
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
              modules={scrollableModules}
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
  modules: SectorModuleConfig[];
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
  newsItems,
  modules
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

  const intradaySectionId = modules.find(module => module.id === "intraday")?.sectionId ?? "intraday-trend";
  const performanceSectionId = modules.find(module => module.id === "performance")?.sectionId ?? "performance";
  const insightsSectionId = modules.find(module => module.id === "insights")?.sectionId ?? "insights";
  const moversSectionId = modules.find(module => module.id === "gainers-losers")?.sectionId ?? "movers";
  const newsSectionId = modules.find(module => module.id === "news")?.sectionId ?? "news";
  const stocksSectionId = modules.find(module => module.id === "stocks")?.sectionId ?? "stocks";

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

      <section id={intradaySectionId} className={SECTION_WRAPPER_CLASS}>
        <SectorChart
          sectorIndex={data.sectorIndex}
          history={sectorHistory}
          title={chartTitle}
          subtitle={`Live movement of ${data.sectorIndex.name || sectorName.toUpperCase()}`}
        />
      </section>

      <section id={performanceSectionId} className={SECTION_WRAPPER_CLASS}>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
          <PerformanceChart
            companies={data.companies}
            title={`${sectorName} Performance`}
            description={heatmapDescription}
          />
          <MarketCapOverview companies={data.companies} marketCapBySymbol={marketCapBySymbol} sectorName={sectorName} />
        </section>
      </section>

      <section id={insightsSectionId} className={SECTION_WRAPPER_CLASS}>
        <InsightsPanel
          sectorSpot={data.sectorIndex.lastPrice}
          averageChange={averageChange}
          advances={advances}
          declines={declines}
          totalVolume={totalVolume}
          volumeLeaderSymbol={volumeLeader?.symbol}
          sectorName={sectorName}
          title={`${sectorName} Insights`}
          subtitle="Breadth, momentum, and turnover"
        />
      </section>

      <section id={moversSectionId} className={SECTION_WRAPPER_CLASS}>
        <TopMoversPanel gainers={data.gainers} losers={data.losers} />
      </section>

      <section id={newsSectionId} className={SECTION_WRAPPER_CLASS}>
        <SectorNewsPanel title={newsTitle} items={newsItems} />
      </section>

      <section id={stocksSectionId} className={SECTION_WRAPPER_CLASS}>
        <StockTable
          companies={data.companies}
          historyBySymbol={companyHistory}
          signals={signals}
          query={search}
          title={tableTitle}
          subtitle={tableSubtitle}
        />
      </section>
    </section>
  );
}
