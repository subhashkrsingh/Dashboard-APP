import { useQuery } from "@tanstack/react-query";

import { CompanyComparisonChart } from "./components/dashboard/CompanyComparisonChart";
import { CompanyTable } from "./components/dashboard/CompanyTable";
import { DashboardSkeleton } from "./components/dashboard/DashboardSkeleton";
import { HeaderBar } from "./components/dashboard/HeaderBar";
import { IntradaySectorChart } from "./components/dashboard/IntradaySectorChart";
import { MarketMoversPanel } from "./components/dashboard/MarketMoversPanel";
import { PerformanceBar } from "./components/dashboard/PerformanceBar";
import { SectorCards } from "./components/dashboard/SectorCards";
import { useMarketHistory } from "./hooks/useMarketHistory";
import { fetchPowerSectorData } from "./services/powerSectorApi";

export default function App() {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: ["power-sector-dashboard"],
    queryFn: fetchPowerSectorData,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    staleTime: 9500
  });

  const { sectorHistory, companyHistory, signals } = useMarketHistory(data);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
        <div className="mx-auto max-w-7xl">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }

  if (!data || error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load market data";

    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-rose-500/50 bg-rose-500/10 p-6">
          <h2 className="font-display text-2xl text-rose-100">Power sector data unavailable</h2>
          <p className="mt-2 text-sm text-rose-100/90">{errorMessage}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-rose-300/60 bg-rose-500/20 px-4 py-2 text-sm font-semibold hover:bg-rose-500/30"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.15),transparent_38%),linear-gradient(180deg,#020617_0%,#030712_45%,#111827_100%)] px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <HeaderBar
          companies={data.companies}
          marketStatus={data.marketStatus}
          fetchedAt={data.fetchedAt}
          isFetching={isFetching}
        />

        {data.stale && (
          <section className="rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {data.warning ?? "Using cached snapshot while the NSE feed is temporarily restricted."}
          </section>
        )}

        {data.fallbackIndexUsed && (
          <section className="rounded-xl border border-cyan-300/45 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            Requested index {data.requestedIndex ?? "NIFTY POWER"} is currently unavailable from `sectorIndices`.
            Displaying closest live sector benchmark in the feed.
          </section>
        )}

        <SectorCards
          sectorIndex={data.sectorIndex}
          gainers={data.gainers}
          losers={data.losers}
          companies={data.companies}
          marketStatus={data.marketStatus}
          signals={signals}
        />

        <PerformanceBar companies={data.companies} />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <IntradaySectorChart sectorIndex={data.sectorIndex} history={sectorHistory} />
          <MarketMoversPanel gainers={data.gainers} losers={data.losers} />
        </section>

        <CompanyComparisonChart companies={data.companies} historyBySymbol={companyHistory} />

        <CompanyTable companies={data.companies} signals={signals} />
      </div>
    </main>
  );
}
