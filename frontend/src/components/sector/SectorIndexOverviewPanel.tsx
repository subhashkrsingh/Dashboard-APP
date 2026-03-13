import { Activity, ArrowUpRight, CandlestickChart, Gauge, IndianRupee, Scale, Wallet } from "lucide-react";

import { formatCompactNumber, formatPercent, formatPrice, formatSignedPrice, formatVolume } from "../../lib/formatters";
import type { SectorReturnWindow, SectorSnapshot } from "../../types/market";
import { TrendIndicator } from "../ui/TrendIndicator";

interface SectorIndexOverviewPanelProps {
  data: SectorSnapshot;
}

const RETURN_WINDOWS: SectorReturnWindow[] = ["1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y"];

interface StatCard {
  label: string;
  value: string;
  icon: typeof Activity;
  tone?: "default" | "positive" | "negative";
}

function formatRatio(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "--";
  return Number(value).toFixed(2);
}

function formatCurrencyCompact(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "--";
  return `Rs ${formatCompactNumber(value)}`;
}

function formatReturnValue(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "--";
  const numeric = Number(value);
  const prefix = numeric > 0 ? "+" : "";
  return `${prefix}${numeric.toFixed(2)}%`;
}

function getMarkerPosition(current: number | null | undefined, low: number | null | undefined, high: number | null | undefined) {
  if (!Number.isFinite(current) || !Number.isFinite(low) || !Number.isFinite(high)) return null;
  const min = Number(low);
  const max = Number(high);
  if (max <= min) return null;

  const normalized = ((Number(current) - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, normalized));
}

function RangeBar({
  label,
  low,
  high,
  current
}: {
  label: string;
  low: number | null | undefined;
  high: number | null | undefined;
  current: number | null | undefined;
}) {
  const markerPosition = getMarkerPosition(current, low, high);

  if (markerPosition === null) {
    return null;
  }

  return (
    <article className="rounded-2xl border border-[#E6EAF2] bg-white/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{formatPrice(current)}</p>
      </div>

      <div className="relative h-3 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500">
        <span
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-white bg-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.18)]"
          style={{ left: `calc(${markerPosition}% - 10px)` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Low</p>
          <p className="font-semibold text-slate-900">{formatPrice(low)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">High</p>
          <p className="font-semibold text-slate-900">{formatPrice(high)}</p>
        </div>
      </div>
    </article>
  );
}

export function SectorIndexOverviewPanel({ data }: SectorIndexOverviewPanelProps) {
  const { sectorIndex, advanceDecline, companies, sourceTimestamp, fetchedAt } = data;
  const tradedVolume = sectorIndex.tradedVolume ?? companies.reduce((sum, company) => sum + (company.volume ?? 0), 0);
  const previousClose =
    sectorIndex.previousClose ??
    (sectorIndex.lastPrice !== null && sectorIndex.change !== null ? sectorIndex.lastPrice - sectorIndex.change : null);
  const isPositive = (sectorIndex.percentChange ?? 0) >= 0;
  const returns = sectorIndex.returns
    ? RETURN_WINDOWS.map(window => ({
        window,
        value: sectorIndex.returns?.[window] ?? null
      })).filter(metric => metric.value !== null)
    : [];

  const stats: StatCard[] = [
    {
      label: "Prev Close",
      value: formatPrice(previousClose),
      icon: CandlestickChart
    },
    {
      label: "Open",
      value: formatPrice(sectorIndex.open),
      icon: ArrowUpRight
    },
    {
      label: "Volume",
      value: formatVolume(tradedVolume),
      icon: Activity
    },
    {
      label: "Value",
      value: formatCurrencyCompact(sectorIndex.tradedValue),
      icon: IndianRupee
    },
    {
      label: "FFM Cap",
      value: formatCurrencyCompact(sectorIndex.ffmCap),
      icon: Wallet
    },
    {
      label: "Adv / Dec / Unch",
      value: `${advanceDecline?.advances ?? 0} / ${advanceDecline?.declines ?? 0} / ${advanceDecline?.unchanged ?? 0}`,
      icon: Gauge,
      tone:
        (advanceDecline?.advances ?? 0) > (advanceDecline?.declines ?? 0)
          ? "positive"
          : (advanceDecline?.advances ?? 0) < (advanceDecline?.declines ?? 0)
          ? "negative"
          : "default"
    },
    {
      label: "P/E",
      value: formatRatio(sectorIndex.pe),
      icon: Scale
    },
    {
      label: "P/B",
      value: formatRatio(sectorIndex.pb),
      icon: Scale
    }
  ];

  return (
    <section className="glass-card rounded-3xl border border-[#E6EAF2] p-5 md:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-[0.26em] text-blue-600">{sectorIndex.name}</p>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
              As of {sourceTimestamp || fetchedAt}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <h2 className="font-display text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              {formatPrice(sectorIndex.lastPrice)}
            </h2>
            <div
              className={`mb-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              <TrendIndicator value={sectorIndex.percentChange} />
              <span>{formatSignedPrice(sectorIndex.change)}</span>
              <span>({formatPercent(sectorIndex.percentChange)})</span>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Live index snapshot for {sectorIndex.name}. The overview page now keeps the benchmark tape, breadth,
            valuation, and range context visible before you drill into module-specific pages.
          </p>
        </div>

        <div className="grid min-w-[280px] gap-3 md:grid-cols-2 xl:w-[360px] xl:grid-cols-1">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600">Indicative Close</p>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-950">
              {formatPrice(sectorIndex.indicativeClose)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Reference close signal from the latest exchange index payload.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Breadth Snapshot</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-500">Adv</p>
                <p className="mt-1 text-lg font-semibold">{advanceDecline?.advances ?? 0}</p>
              </div>
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700">
                <p className="text-[11px] uppercase tracking-[0.16em] text-rose-500">Dec</p>
                <p className="mt-1 text-lg font-semibold">{advanceDecline?.declines ?? 0}</p>
              </div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Unch</p>
                <p className="mt-1 text-lg font-semibold">{advanceDecline?.unchanged ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          const toneClass =
            stat.tone === "positive"
              ? "border-emerald-200 bg-emerald-50"
              : stat.tone === "negative"
              ? "border-rose-200 bg-rose-50"
              : "border-[#E6EAF2] bg-white";

          return (
            <article key={`${sectorIndex.name}-${stat.label}`} className={`rounded-2xl border p-4 ${toneClass}`}>
              <div className="flex items-center gap-2 text-slate-500">
                <Icon className="h-4 w-4" />
                <p className="text-[11px] uppercase tracking-[0.18em]">{stat.label}</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-950">{stat.value}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="grid gap-4">
          <RangeBar
            label="52 Week Range"
            low={sectorIndex.yearLow}
            high={sectorIndex.yearHigh}
            current={sectorIndex.lastPrice}
          />
          <RangeBar
            label="Intraday Range"
            low={sectorIndex.dayLow}
            high={sectorIndex.dayHigh}
            current={sectorIndex.lastPrice}
          />
        </div>

        {returns.length > 0 ? (
          <div className="rounded-2xl border border-[#E6EAF2] bg-white p-4">
            <div className="mb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Returns</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-slate-950">Index Horizons</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {returns.map(metric => {
                const isMetricPositive = (metric.value ?? 0) >= 0;

                return (
                  <article
                    key={`${sectorIndex.name}-${metric.window}`}
                    className={`rounded-2xl border px-4 py-3 ${
                      isMetricPositive ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{metric.window}</p>
                    <p className={`mt-2 text-xl font-semibold ${isMetricPositive ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatReturnValue(metric.value)}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
