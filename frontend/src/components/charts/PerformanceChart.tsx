import { useMemo } from "react";

import { formatPercent } from "../../lib/formatters";
import type { CompanyQuote } from "../../types/market";

interface PerformanceChartProps {
  companies: CompanyQuote[];
  title?: string;
  description?: string;
}

function getHeatColor(change: number | null | undefined) {
  if (!Number.isFinite(change)) return "rgba(148, 163, 184, 0.2)";

  const value = Math.min(Math.abs(Number(change)) / 4, 1);
  if (Number(change) >= 0) {
    return `rgba(22, 163, 74, ${0.15 + value * 0.22})`;
  }
  return `rgba(220, 38, 38, ${0.15 + value * 0.22})`;
}

export function PerformanceChart({
  companies,
  title = "Sector Heatmap",
  description = "Instant gain/loss map for power companies"
}: PerformanceChartProps) {
  const data = useMemo(
    () =>
      [...companies]
        .sort((a, b) => (b.percentChange ?? Number.NEGATIVE_INFINITY) - (a.percentChange ?? Number.NEGATIVE_INFINITY))
        .slice(0, 12),
    [companies]
  );

  const advances = companies.filter(item => (item.percentChange ?? 0) > 0).length;
  const declines = companies.filter(item => (item.percentChange ?? 0) < 0).length;
  const unchanged = Math.max(0, companies.length - advances - declines);

  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
          Adv: {advances}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-slate-700">
          Flat: {unchanged}
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
          Dec: {declines}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.map(company => {
          const isPositive = (company.percentChange ?? 0) >= 0;
          return (
            <article
              key={company.symbol}
              className="rounded-lg border border-white/60 px-3 py-2 shadow-sm"
              style={{ background: getHeatColor(company.percentChange) }}
            >
              <p className="text-sm font-semibold text-slate-900">{company.symbol}</p>
              <p className="truncate text-[11px] text-slate-700/90">{company.name}</p>
              <p className={`text-xs font-medium ${isPositive ? "text-emerald-700" : "text-rose-700"}`}>
                {formatPercent(company.percentChange)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
