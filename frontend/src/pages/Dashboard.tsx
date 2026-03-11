import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { MarketCard } from "../components/cards/MarketCard";
import { SectorCard } from "../components/cards/SectorCard";
import { PerformanceChart } from "../components/charts/PerformanceChart";
import { SectorChart } from "../components/charts/SectorChart";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";
import { Navbar } from "../components/layout/Navbar";
import { Sidebar } from "../components/layout/Sidebar";
import { StockTable } from "../components/tables/StockTable";
import { formatPercent, formatPrice, formatVolume } from "../lib/formatters";
import { useMarketData } from "../hooks/useMarketData";
import type { CompanyQuote } from "../types/market";

function getTopByPercent(companies: CompanyQuote[], direction: "max" | "min") {
  const sorted = [...companies].sort((a, b) => {
    const aValue = Number.isFinite(a.percentChange) ? Number(a.percentChange) : 0;
    const bValue = Number.isFinite(b.percentChange) ? Number(b.percentChange) : 0;
    return direction === "max" ? bValue - aValue : aValue - bValue;
  });
  return sorted[0];
}

export function DashboardPage() {
  const [search, setSearch] = useState("");
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0B1220] p-4 text-slate-100 md:p-6">
        <DashboardSkeleton />
      </main>
    );
  }

  if (!data || error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load market data";
    return (
      <main className="min-h-screen bg-[#0B1220] p-4 text-slate-100 md:p-6">
        <section className="glass-card rounded-2xl border border-rose-400/35 p-6">
          <h2 className="font-display text-2xl text-rose-100">Power sector data unavailable</h2>
          <p className="mt-2 text-sm text-rose-100/90">{errorMessage}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-rose-300/60 bg-rose-500/20 px-4 py-2 text-sm font-semibold hover:bg-rose-500/30"
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

  return (
    <main className="relative min-h-screen bg-[#0B1220] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(6,182,212,0.12),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_35%),linear-gradient(180deg,#0B1220_0%,#0A1426_100%)]" />

      <div className="relative z-10 flex min-h-screen">
        <div className="hidden w-[280px] shrink-0 xl:block">
          <Sidebar companies={data.companies} />
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
                <Sidebar companies={data.companies} onClose={() => setSidebarOpen(false)} />
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
            search={search}
            onSearchChange={setSearch}
            onOpenSidebar={() => setSidebarOpen(true)}
          />

          <div className="space-y-4 px-4 py-4 md:px-6">
            {data.stale ? (
              <section className="glass-card rounded-xl border border-amber-400/45 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {data.warning ?? "Using cached snapshot while the NSE feed is temporarily restricted."}
              </section>
            ) : null}

            {data.fallbackIndexUsed ? (
              <section className="glass-card rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                Requested index {data.requestedIndex ?? "NIFTY POWER"} was unavailable. Showing closest live benchmark
                from feed.
              </section>
            ) : null}

            <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <SectorCard sectorIndex={data.sectorIndex} signal={signals.__sector} />

              <MarketCard
                title="Top Gainer"
                value={topGainer?.symbol ?? "--"}
                subtitle={formatPrice(topGainer?.price)}
                change={topGainer?.percentChange}
                icon="UP"
                tone="positive"
                signal={topGainer ? signals[topGainer.symbol] : undefined}
              />

              <MarketCard
                title="Top Loser"
                value={topLoser?.symbol ?? "--"}
                subtitle={formatPrice(topLoser?.price)}
                change={topLoser?.percentChange}
                icon="DN"
                tone="negative"
                signal={topLoser ? signals[topLoser.symbol] : undefined}
              />

              <MarketCard
                title="Volume Leader"
                value={volumeLeader?.symbol ?? "--"}
                subtitle={formatVolume(volumeLeader?.volume)}
                change={volumeLeader?.percentChange}
                icon="VOL"
                tone="accent"
                signal={volumeLeader ? signals[volumeLeader.symbol] : undefined}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)]">
              <SectorChart sectorIndex={data.sectorIndex} history={sectorHistory} />

              <aside className="space-y-4">
                <PerformanceChart companies={data.companies} />

                <section className="glass-card rounded-2xl border border-slate-700/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-slate-100">Insights Panel</h3>
                    <span className="text-xs text-slate-400">AI signals + fundamentals</span>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-[#0B1220]/75 px-3 py-2">
                      <dt className="text-slate-400">Sector Spot</dt>
                      <dd className="font-semibold text-slate-100">{formatPrice(data.sectorIndex.lastPrice)}</dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-[#0B1220]/75 px-3 py-2">
                      <dt className="text-slate-400">Average Change</dt>
                      <dd className="font-semibold text-cyan-200">{formatPercent(averageChange)}</dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-[#0B1220]/75 px-3 py-2">
                      <dt className="text-slate-400">Breadth</dt>
                      <dd className="font-semibold text-slate-100">
                        {advances} Adv / {declines} Dec
                      </dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-[#0B1220]/75 px-3 py-2">
                      <dt className="text-slate-400">Traded Volume</dt>
                      <dd className="font-semibold text-slate-100">{formatVolume(totalVolume)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 space-y-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-cyan-100">AI Insights</p>
                    <p className="text-sm text-slate-100">
                      Momentum is {averageChange >= 0 ? "positive" : "negative"} with{" "}
                      <span className="font-semibold">{advances}</span> advancing symbols.
                    </p>
                    <p className="text-sm text-slate-200">
                      Volume concentration remains highest in <span className="font-semibold">{volumeLeader?.symbol ?? "--"}</span>.
                    </p>
                    <p className="text-sm text-slate-200">
                      Watch for continuation if sector index holds above{" "}
                      <span className="font-semibold">{formatPrice(data.sectorIndex.lastPrice)}</span>.
                    </p>
                  </div>
                </section>
              </aside>
            </section>

            <StockTable
              companies={data.companies}
              historyBySymbol={companyHistory}
              signals={signals}
              query={search}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
