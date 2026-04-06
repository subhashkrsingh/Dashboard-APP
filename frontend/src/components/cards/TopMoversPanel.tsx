import { TrendingDown, TrendingUp } from "lucide-react";

import { formatPercent, formatPrice } from "../../lib/formatters";
import type { CompanyQuote } from "../../types/market";

interface TopMoversPanelProps {
  gainers: CompanyQuote[];
  losers: CompanyQuote[];
}

export function TopMoversPanel({ gainers, losers }: TopMoversPanelProps) {
  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4">
      <div className="mb-3">
        <h3 className="font-display text-lg font-semibold text-slate-900">Top Gainers / Losers</h3>
        <p className="text-xs text-slate-500">Fast-moving stocks this session</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" />
            Gainers
          </div>
          <ul className="space-y-1.5">
            {gainers.length === 0 ? (
              <li className="rounded-lg bg-white px-2 py-3 text-xs text-slate-500">No results found</li>
            ) : (
              gainers.slice(0, 5).map(item => (
                <li key={`g-${item.symbol}`} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{item.symbol}</p>
                    <p className="text-slate-500">{formatPrice(item.price)}</p>
                  </div>
                  <p className="font-semibold text-emerald-700">{formatPercent(item.percentChange)}</p>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
            <TrendingDown className="h-3.5 w-3.5" />
            Losers
          </div>
          <ul className="space-y-1.5">
            {losers.length === 0 ? (
              <li className="rounded-lg bg-white px-2 py-3 text-xs text-slate-500">No results found</li>
            ) : (
              losers.slice(0, 5).map(item => (
                <li key={`l-${item.symbol}`} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{item.symbol}</p>
                    <p className="text-slate-500">{formatPrice(item.price)}</p>
                  </div>
                  <p className="font-semibold text-rose-700">{formatPercent(item.percentChange)}</p>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}
