import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Header from "./components/Header.jsx";
import MarketMovers from "./components/MarketMovers.jsx";
import PowerChart from "./components/PowerChart.jsx";
import PowerTable from "./components/PowerTable.jsx";
import SectorHeatmap from "./components/SectorHeatmap.jsx";
import SectorSummary from "./components/SectorSummary.jsx";
import { fetchPowerSectorSnapshot } from "./services/powerSectorApi.js";

const MAX_CHART_POINTS = 80;

function formatTimeLabel(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata"
  }).format(date);
}

function ErrorState({ message, onRetry }) {
  return (
    <section className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-red-100 shadow-glow">
      <h2 className="font-display text-xl">Unable to load live market data</h2>
      <p className="mt-2 text-sm text-red-100/90">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-lg border border-red-300/50 bg-red-500/20 px-4 py-2 text-sm font-semibold transition hover:bg-red-500/35"
      >
        Retry now
      </button>
    </section>
  );
}

export default function App() {
  const [chartPoints, setChartPoints] = useState([]);

  const {
    data,
    isLoading,
    error,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ["power-sector"],
    queryFn: fetchPowerSectorSnapshot,
    refetchInterval: 10000,
    refetchIntervalInBackground: true
  });

  useEffect(() => {
    if (!Number.isFinite(data?.lastPrice)) return;

    setChartPoints(previous => {
      const point = {
        time: formatTimeLabel(data?.fetchedAt),
        value: data.lastPrice
      };

      if (previous.length > 0) {
        const last = previous[previous.length - 1];
        if (last.time === point.time) {
          const replaced = [...previous];
          replaced[replaced.length - 1] = point;
          return replaced;
        }
      }

      return [...previous, point].slice(-MAX_CHART_POINTS);
    });
  }, [data?.fetchedAt, data?.lastPrice]);

  const errorMessage =
    error?.response?.data?.error ||
    error?.message ||
    "NSE endpoint is currently unavailable. Please retry.";

  const companies = useMemo(() => data?.companies || [], [data?.companies]);
  const movers = useMemo(
    () => ({
      topGainers: data?.topGainers || [],
      topLosers: data?.topLosers || []
    }),
    [data?.topGainers, data?.topLosers]
  );

  return (
    <div className="min-h-screen bg-dashboard-bg text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.2),_transparent_45%),radial-gradient(circle_at_80%_0,_rgba(14,165,233,0.16),_transparent_35%),linear-gradient(170deg,_#020617_0%,_#030712_45%,_#111827_100%)]" />
      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <Header
          marketStatus={data?.marketStatus}
          isFetching={isFetching}
          fetchedAt={data?.fetchedAt}
        />

        {isLoading && (
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="h-44 animate-pulse rounded-2xl border border-slate-700/70 bg-dashboard-panel/70" />
            <div className="h-44 animate-pulse rounded-2xl border border-slate-700/70 bg-dashboard-panel/70" />
            <div className="h-44 animate-pulse rounded-2xl border border-slate-700/70 bg-dashboard-panel/70" />
          </section>
        )}

        {!isLoading && error && <ErrorState message={errorMessage} onRetry={refetch} />}

        {!isLoading && !error && data && (
          <>
            {data?.stale && (
              <section className="rounded-2xl border border-amber-400/45 bg-amber-300/10 p-4 text-sm text-amber-100">
                {data?.warning || "Showing the most recent cached snapshot while NSE is rate-limiting."}
              </section>
            )}

            <section className="grid gap-4 lg:grid-cols-3">
              <SectorSummary
                indexName={data?.indexName}
                requestedIndex={data?.requestedIndex}
                fallbackIndexUsed={data?.fallbackIndexUsed}
                lastPrice={data?.lastPrice}
                percentChange={data?.percentChange}
                advanceDecline={data?.advanceDecline}
                marketStatus={data?.marketStatus}
              />

              <div className="rounded-2xl border border-dashboard-border/80 bg-dashboard-panel/90 p-5 shadow-glow">
                <h3 className="font-display text-lg text-white">Feed Health</h3>
                <dl className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <dt>Polling Interval</dt>
                    <dd className="font-semibold text-cyan-300">10s</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Source Timestamp</dt>
                    <dd className="font-semibold text-slate-200">{data?.sourceTimestamp || "--"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Last Refresh (IST)</dt>
                    <dd className="font-semibold text-slate-200">{formatDateTime(data?.fetchedAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Cache</dt>
                    <dd className="font-semibold text-slate-200">
                      {data?.cached ? "HIT" : "MISS"}
                      {data?.stale ? " / STALE" : ""}
                    </dd>
                  </div>
                </dl>
              </div>

              <SectorHeatmap companies={companies} />
            </section>

            <section className="rounded-2xl border border-dashboard-border/80 bg-dashboard-panel/90 p-5 shadow-glow">
              <PowerChart
                points={chartPoints}
                currentPrice={data?.lastPrice}
                percentChange={data?.percentChange}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <MarketMovers title="Top Gainers" rows={movers.topGainers} positive />
              <MarketMovers title="Top Losers" rows={movers.topLosers} positive={false} />
            </section>

            <section className="rounded-2xl border border-dashboard-border/80 bg-dashboard-panel/90 p-5 shadow-glow">
              <PowerTable companies={companies} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
