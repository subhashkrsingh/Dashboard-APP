import { useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Navbar } from "../components/Navbar";
import { PageHeader } from "../components/PageHeader";
import { MarketCard } from "../components/cards/MarketCard";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";
import { FooterBar } from "../components/dashboard/FooterBar";
import { Sparkline } from "../components/ui/Sparkline";
import type { SectorMarketDataResult } from "../hooks/useSectorMarketData";
import {
  formatClock,
  formatCompactNumber,
  formatPercent,
  formatPrice,
  formatSignedPrice,
  formatVolume
} from "../lib/formatters";
import type { SectorConfig } from "../lib/sectorConfig";

interface SectorCompanyPageProps {
  config: SectorConfig;
  marketData: SectorMarketDataResult;
  onOpenSidebar: () => void;
}

function rankCompany(
  symbol: string,
  companies: SectorMarketDataResult["data"]["companies"],
  metric: (company: (typeof companies)[number]) => number
) {
  const ranked = [...companies]
    .filter(company => Number.isFinite(metric(company)))
    .sort((left, right) => metric(right) - metric(left));

  const index = ranked.findIndex(company => company.symbol === symbol);
  return index >= 0 ? index + 1 : null;
}

export function SectorCompanyPage({ config, marketData, onOpenSidebar }: SectorCompanyPageProps) {
  const [search, setSearch] = useState("");
  const { symbol } = useParams();
  const normalizedSymbol = String(symbol ?? "").trim().toUpperCase();
  const { data, error, isLoading, isFetching, companyHistory, signals } = marketData;

  const company = useMemo(
    () => data?.companies.find(item => item.symbol.toUpperCase() === normalizedSymbol),
    [data?.companies, normalizedSymbol]
  );
  const trendPoints = company ? companyHistory[company.symbol] ?? [] : [];
  const companySignal = company ? signals[company.symbol] : undefined;
  const peerChangeRank = company && data ? rankCompany(company.symbol, data.companies, item => item.percentChange ?? Number.NaN) : null;
  const peerVolumeRank = company && data ? rankCompany(company.symbol, data.companies, item => item.volume ?? Number.NaN) : null;
  const sectorAverageChange = useMemo(() => {
    if (!data?.companies.length) {
      return 0;
    }

    return data.companies.reduce((sum, item) => sum + (item.percentChange ?? 0), 0) / data.companies.length;
  }, [data?.companies]);
  const peerLeaders = useMemo(
    () =>
      data
        ? [...data.companies]
            .sort((left, right) => Math.abs(right.percentChange ?? 0) - Math.abs(left.percentChange ?? 0))
            .slice(0, 6)
        : [],
    [data]
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Navbar
        companies={data?.companies ?? []}
        marketStatus={data?.marketStatus}
        fetchedAt={data?.fetchedAt}
        isFetching={isFetching}
        dataStatus={data?.dataStatus}
        cacheAgeMs={data?.cacheAgeMs}
        apiCacheStatus={data?.apiCacheStatus}
        marketSnapshot={data}
        search={search}
        onSearchChange={setSearch}
        searchResultHref={nextSymbol => `${config.basePath}/${encodeURIComponent(nextSymbol)}`}
        onOpenSidebar={onOpenSidebar}
      />

      <div className="space-y-4 px-4 py-4 md:px-6">
        {isLoading ? <DashboardSkeleton /> : null}

        {!isLoading && !data ? (
          <section className="glass-card rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <h2 className="font-display text-2xl text-rose-700">{config.sectorName} company view unavailable</h2>
            <p className="mt-2 text-sm text-rose-700/90">
              {error instanceof Error ? error.message : "Failed to load company analytics"}
            </p>
          </section>
        ) : null}

        {!isLoading && data && !company ? (
          <>
            <PageHeader
              eyebrow={config.dashboardLabel}
              title={`${normalizedSymbol || "Unknown Symbol"} Not Found`}
              description={`We could not match that symbol inside the current ${config.sectorName.toLowerCase()} snapshot.`}
            />
            <section className="glass-card rounded-2xl border border-[#E6EAF2] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  to={config.basePath}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to {config.sectorName}
                </Link>
                <p className="text-sm text-slate-500">Popular symbols from this sector</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.companies.slice(0, 6).map(item => (
                  <Link
                    key={item.symbol}
                    to={`${config.basePath}/${encodeURIComponent(item.symbol)}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/60"
                  >
                    <p className="text-sm font-semibold text-slate-900">{item.symbol}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {!isLoading && data && company ? (
          <>
            <section className="glass-card rounded-[28px] border border-[#E6EAF2] p-5 md:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <Link
                    to={config.basePath}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to {config.sectorName}
                  </Link>
                  <p className="mt-4 text-xs uppercase tracking-[0.24em] text-blue-600">{config.dashboardLabel}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">
                      {company.symbol} Analytics
                    </h1>
                  </div>
                  <p className="mt-2 text-base font-medium text-slate-700">{company.name}</p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                    Single-name analytics generated from the live and cached {config.sectorName.toLowerCase()} snapshot,
                    including price action, turnover, and trend context.
                  </p>
                </div>

                <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Updated</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatClock(data.fetchedAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">Status: {data.dataStatus ?? "live"}</p>
                </article>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <MarketCard
                title="Symbol"
                value={company.symbol}
                subtitle={company.name}
                change={company.percentChange}
                icon={<Activity className="h-3.5 w-3.5 text-blue-600" />}
                tone="neutral"
                signal={companySignal}
              />
              <MarketCard
                title="Last Price"
                value={formatPrice(company.price)}
                subtitle="Current traded price"
                change={company.percentChange}
                icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
                tone={(company.percentChange ?? 0) >= 0 ? "positive" : "negative"}
                signal={companySignal}
              />
              <MarketCard
                title="Day Change"
                value={formatPercent(company.percentChange)}
                subtitle={formatSignedPrice(company.change)}
                change={company.percentChange}
                icon={
                  (company.percentChange ?? 0) >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                  )
                }
                tone={(company.percentChange ?? 0) >= 0 ? "positive" : "negative"}
                signal={companySignal}
              />
              <MarketCard
                title="Volume"
                value={formatCompactNumber(company.volume)}
                subtitle={peerVolumeRank ? `Rank #${peerVolumeRank} in sector` : formatVolume(company.volume)}
                change={company.percentChange}
                icon={<BarChart3 className="h-3.5 w-3.5 text-blue-600" />}
                tone="accent"
                signal={companySignal}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
              <section className="glass-card rounded-2xl border border-[#E6EAF2] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-slate-900">{company.symbol} Trend</h2>
                    <p className="text-sm text-slate-500">Recent observed price history from the dashboard cache.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Trend Points</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{trendPoints.length}</p>
                  </div>
                </div>
                <div className="mt-6 h-56 rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(255,255,255,0.98))] p-4">
                  <Sparkline points={trendPoints} positive={(company.percentChange ?? 0) >= 0} />
                </div>
              </section>

              <section className="glass-card rounded-2xl border border-[#E6EAF2] p-5">
                <h2 className="font-display text-xl font-semibold text-slate-900">Sector Context</h2>
                <p className="mt-2 text-sm text-slate-500">Where this symbol sits inside the broader sector tape.</p>
                <div className="mt-4 space-y-3">
                  <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Performance Rank</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {peerChangeRank ? `#${peerChangeRank}` : "--"}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Sector Average Change</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatPercent(sectorAverageChange)}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Sector Spot</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatPrice(data.sectorIndex.lastPrice)}</p>
                  </article>
                </div>
              </section>
            </section>

            <section className="glass-card rounded-2xl border border-[#E6EAF2] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-900">Sector Movers Context</h2>
                  <p className="text-sm text-slate-500">Quick comparison against the biggest movers in the same sector.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {peerLeaders.map(item => {
                  const active = item.symbol === company.symbol;
                  const positive = (item.percentChange ?? 0) >= 0;

                  return (
                    <article
                      key={item.symbol}
                      className={`rounded-2xl border px-4 py-3 ${
                        active
                          ? "border-blue-300 bg-blue-50 shadow-[0_0_0_1px_rgba(37,99,235,0.12)]"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.symbol}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.name}</p>
                        </div>
                        {active ? (
                          <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className={positive ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                          {formatPercent(item.percentChange)}
                        </span>
                        <span className="text-slate-500">{formatVolume(item.volume)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        ) : null}

        <FooterBar productLabel={`${config.dashboardLabel} Company View`} dataSourceLabel={config.dataSourceLabel} />
      </div>
    </div>
  );
}
