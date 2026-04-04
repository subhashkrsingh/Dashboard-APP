import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, BarChart3, TrendingDown, TrendingUp } from "lucide-react";

import { InsightsPanel } from "../components/cards/InsightsPanel";
import { MarketCard } from "../components/cards/MarketCard";
import { SectorCard } from "../components/cards/SectorCard";
import { PerformanceChart } from "../components/charts/PerformanceChart";
import { SectorIntradayChart } from "../components/charts/SectorIntradayChart";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";
import { FooterBar } from "../components/dashboard/FooterBar";
import { Navbar } from "../components/layout/Navbar";
import { Sidebar, type SidebarPage } from "../components/layout/Sidebar";
import { StockTable } from "../components/tables/StockTable";
import { shouldShowInlineCacheBanner } from "../lib/cacheStatus";
import { formatPercent, formatPrice, formatVolume } from "../lib/formatters";
import { useMarketData } from "../hooks/useMarketData";
import type { CompanyQuote } from "../types/market";

const DEFAULT_PAGE: SidebarPage = "dashboard";
const PAGE_HASH: Record<SidebarPage, string> = {
  dashboard: "#/dashboard",
  companies: "#/companies",
  analytics: "#/analytics",
  alerts: "#/alerts",
  watchlist: "#/watchlist",
  settings: "#/settings"
};

function getPageFromHash(hash: string): SidebarPage {
  const entry = (Object.entries(PAGE_HASH) as Array<[SidebarPage, string]>).find(([, value]) => value === hash);
  return entry?.[0] ?? DEFAULT_PAGE;
}

function getTopByPercent(companies: CompanyQuote[], direction: "max" | "min") {
  const sorted = [...companies].sort((a, b) => {
    const aValue = Number.isFinite(a.percentChange) ? Number(a.percentChange) : 0;
    const bValue = Number.isFinite(b.percentChange) ? Number(b.percentChange) : 0;
    return direction === "max" ? bValue - aValue : aValue - bValue;
  });
  return sorted[0];
}

function getPageTitle(page: SidebarPage): string {
  switch (page) {
    case "dashboard":
      return "Dashboard";
    case "companies":
      return "Energy Companies";
    case "analytics":
      return "Sector Analytics";
    case "alerts":
      return "Alerts";
    case "watchlist":
      return "Watchlist";
    case "settings":
      return "Settings";
    default:
      return "Dashboard";
  }
}

export function DashboardPage() {
  const [search, setSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState<SidebarPage>(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE;
    return getPageFromHash(window.location.hash);
  });
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
    sidebarOpen,
    setSidebarOpen,
    sectorHistory,
    companyHistory,
    signals
  } = useMarketData();

  useEffect(() => {
    const onHashChange = () => setActivePage(getPageFromHash(window.location.hash));

    if (!window.location.hash) {
      window.location.hash = PAGE_HASH.dashboard;
    }

    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F5F7FB] p-4 text-slate-800 md:p-6">
        <DashboardSkeleton />
      </main>
    );
  }

  if (!data || error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load market data";
    return (
      <main className="min-h-screen bg-[#F5F7FB] p-4 text-slate-800 md:p-6">
        <section className="glass-card rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="font-display text-2xl text-rose-700">Energy sector data unavailable</h2>
          <p className="mt-2 text-sm text-rose-700/90">{errorMessage}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

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
    data.advanceDecline?.advances ??
    data.companies.filter(company => (company.percentChange ?? 0) > 0).length;
  const declines =
    data.advanceDecline?.declines ??
    data.companies.filter(company => (company.percentChange ?? 0) < 0).length;
  const showInlineCacheBanner = shouldShowInlineCacheBanner(data);

  const pageTitle = getPageTitle(activePage);

  const navigatePage = (page: SidebarPage) => {
    setActivePage(page);
    setSidebarOpen(false);
    if (window.location.hash !== PAGE_HASH[page]) {
      window.location.hash = PAGE_HASH[page];
    }
  };

  const topMovers = data.gainers.slice(0, 6);
  const bottomMovers = data.losers.slice(0, 6);

  const renderPage = () => {
    if (activePage === "dashboard") {
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

          <SectorIntradayChart
            sectorId="energy-sector"
            title="Sector Intraday Trend"
            week52High={data.sectorIndex.yearHigh}
            week52Low={data.sectorIndex.yearLow}
            intradayHigh={data.sectorIndex.dayHigh}
            intradayLow={data.sectorIndex.dayLow}
          />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,1fr)]">
            <PerformanceChart companies={data.companies} title="Sector Heatmap" />
            <InsightsPanel
              sectorSpot={data.sectorIndex.lastPrice}
              averageChange={averageChange}
              advances={advances}
              declines={declines}
              totalVolume={totalVolume}
              volumeLeaderSymbol={volumeLeader?.symbol}
              compact
            />
          </section>

          <StockTable
            companies={data.companies}
            historyBySymbol={companyHistory}
            signals={signals}
            query={search}
          />
        </section>
      );
    }

    if (activePage === "companies") {
      return (
        <section className="space-y-4">
          <section className="glass-card rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <h2 className="font-display text-xl font-semibold text-blue-700">Energy Companies</h2>
            <p className="mt-1 text-sm text-blue-700/90">
              Dedicated universe scanner with sorting, sticky header, and sparkline trend.
            </p>
          </section>

          <StockTable
            companies={data.companies}
            historyBySymbol={companyHistory}
            signals={signals}
            query={search}
          />
        </section>
      );
    }

    if (activePage === "analytics") {
      return (
        <section className="space-y-4">
          <section className="glass-card rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <h2 className="font-display text-xl font-semibold text-blue-700">Sector Analytics</h2>
            <p className="mt-1 text-sm text-blue-700/90">
              Deep-dive view for trend, momentum, and breadth analytics.
            </p>
          </section>

          <SectorIntradayChart
            sectorId="energy-sector"
            title="Sector Intraday Trend"
            week52High={data.sectorIndex.yearHigh}
            week52Low={data.sectorIndex.yearLow}
            intradayHigh={data.sectorIndex.dayHigh}
            intradayLow={data.sectorIndex.dayLow}
          />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,1fr)]">
            <PerformanceChart companies={data.companies} />
            <InsightsPanel
              sectorSpot={data.sectorIndex.lastPrice}
              averageChange={averageChange}
              advances={advances}
              declines={declines}
              totalVolume={totalVolume}
              volumeLeaderSymbol={volumeLeader?.symbol}
              compact
            />
          </section>
        </section>
      );
    }

    if (activePage === "alerts") {
      return (
        <section className="glass-card rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
          <h2 className="font-display text-xl font-semibold">Alerts Center</h2>
          <p className="mt-2">Configure price, volume, and momentum alerts for energy sector symbols.</p>
        </section>
      );
    }

    if (activePage === "watchlist") {
      return (
        <section className="space-y-4">
          <section className="glass-card rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <h2 className="font-display text-xl font-semibold text-violet-700">Watchlist</h2>
            <p className="mt-1 text-sm text-violet-700/90">Quick movers you are tracking right now.</p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...topMovers, ...bottomMovers].slice(0, 6).map(item => {
              const positive = (item.percentChange ?? 0) >= 0;
              return (
                <article
                  key={`watch-${item.symbol}`}
                  className={`glass-card rounded-xl border p-3 ${
                    positive ? "border-emerald-200" : "border-rose-200"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{item.symbol}</p>
                  <p className="text-xs text-slate-400">{item.name}</p>
                  <p className={`mt-2 text-sm font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatPercent(item.percentChange)}
                  </p>
                </article>
              );
            })}
          </section>
        </section>
      );
    }

    return (
      <section className="glass-card rounded-2xl border border-[#E6EAF2] p-6 text-sm text-slate-700">
        <h2 className="font-display text-xl text-slate-900">{pageTitle}</h2>
        <p className="mt-2">Settings and personalization controls are ready for your next iteration.</p>
      </section>
    );
  };

  return (
    <main className="relative min-h-screen bg-[#F5F7FB] text-slate-800">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(37,99,235,0.08),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.1),transparent_33%),radial-gradient(circle_at_50%_100%,rgba(22,163,74,0.06),transparent_38%),linear-gradient(180deg,#F8FAFF_0%,#F5F7FB_40%,#EEF3FB_100%)]" />

      <div className="relative z-10 flex min-h-screen">
        <div
          className={`hidden shrink-0 transition-[width] duration-300 xl:block ${
            sidebarCollapsed ? "w-[96px]" : "w-[280px]"
          }`}
        >
          <Sidebar
            companies={data.companies}
            activePage={activePage}
            onNavigate={navigatePage}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(current => !current)}
          />
        </div>

        <AnimatePresence>
          {sidebarOpen ? (
            <>
              <motion.div
                className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] xl:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                className="fixed inset-y-0 left-0 z-40 w-[280px] xl:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.2 }}
              >
                <Sidebar
                  companies={data.companies}
                  activePage={activePage}
                  onNavigate={navigatePage}
                  collapsed={false}
                  onClose={() => setSidebarOpen(false)}
                />
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar
            companies={data.companies}
            marketStatus={data.marketStatus}
            fetchedAt={data.fetchedAt}
            isFetching={isFetching}
            dataStatus={data.dataStatus}
            cacheAgeMs={data.cacheAgeMs}
            apiCacheStatus={data.apiCacheStatus}
            marketSnapshot={data}
            search={search}
            onSearchChange={setSearch}
            onOpenSidebar={() => setSidebarOpen(true)}
          />

          <div className="space-y-4 px-4 py-4 md:px-6">
            <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-600">Energy Sector Dashboard</p>
              <div className="mt-2 flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-600" />
                <h1 className="font-display text-2xl font-semibold text-slate-900">{pageTitle}</h1>
              </div>
            </section>

            {data.dataStatus === "offline" ? (
              <section className="glass-card rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {data.message ?? data.warning ?? "Market data temporarily unavailable"}
              </section>
            ) : null}

            {showInlineCacheBanner ? (
              <section className="glass-card rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {data.message ?? data.warning ?? "Showing recent snapshot"}
              </section>
            ) : null}

            {data.fallbackIndexUsed ? (
              <section className="glass-card rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Requested index {data.requestedIndex ?? "NIFTY ENERGY"} was unavailable. Showing closest live benchmark
                from feed.
              </section>
            ) : null}

            {renderPage()}

            <FooterBar />
          </div>
        </div>
      </div>
    </main>
  );
}
