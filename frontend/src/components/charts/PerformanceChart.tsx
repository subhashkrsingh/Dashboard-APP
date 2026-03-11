import { useMemo } from "react";

import { formatPercent } from "../../lib/formatters";
import type { CompanyQuote } from "../../types/market";

interface PerformanceChartProps {
  companies: CompanyQuote[];
  title?: string;
}

function getHeatColor(change: number | null | undefined) {
  if (!Number.isFinite(change)) return "rgba(100, 116, 139, 0.28)";

  const value = Math.min(Math.abs(Number(change)) / 4, 1);
  if (Number(change) >= 0) {
    return `rgba(34, 197, 94, ${0.18 + value * 0.58})`;
  }
  return `rgba(239, 68, 68, ${0.18 + value * 0.58})`;
}

export function PerformanceChart({ companies, title = "Sector Heatmap" }: PerformanceChartProps) {
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
    <section className="glass-card rounded-2xl border border-slate-700/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400">Instant gain/loss map for power companies</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
          Adv: {advances}
        </div>
        <div className="rounded-lg border border-slate-500/40 bg-slate-500/10 px-2 py-1 text-slate-200">
          Flat: {unchanged}
        </div>
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-rose-200">
          Dec: {declines}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.map(company => {
          const isPositive = (company.percentChange ?? 0) >= 0;
          return (
            <article
              key={company.symbol}
              className="rounded-lg border border-white/10 px-3 py-2"
              style={{ background: getHeatColor(company.percentChange) }}
            >
              <p className="text-sm font-semibold text-slate-100">{company.symbol}</p>
              <p className="truncate text-[11px] text-slate-300/90">{company.name}</p>
              <p className={`text-xs font-medium ${isPositive ? "text-emerald-100" : "text-rose-100"}`}>
                {formatPercent(company.percentChange)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
