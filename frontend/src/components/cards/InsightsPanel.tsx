import { formatPercent, formatPrice, formatVolume } from "../../lib/formatters";

interface InsightsPanelProps {
  sectorSpot: number | null;
  averageChange: number;
  advances: number;
  declines: number;
  totalVolume: number;
  volumeLeaderSymbol?: string;
  compact?: boolean;
}

export function InsightsPanel({
  sectorSpot,
  averageChange,
  advances,
  declines,
  totalVolume,
  volumeLeaderSymbol,
  compact = false
}: InsightsPanelProps) {
  if (compact) {
    return (
      <aside className="glass-card h-full rounded-2xl border border-[#E6EAF2] p-4">
        <div className="mb-3">
          <h3 className="font-display text-lg font-semibold text-slate-900">Power Sector Insights</h3>
          <p className="text-xs text-slate-500">Real-time analytics panel</p>
        </div>

        <div className="space-y-3">
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-blue-700">Sector Performance</p>
            <p className="mt-2 text-sm text-slate-800">
              Power sector at <b>{formatPrice(sectorSpot)}</b> with <b>{formatPercent(averageChange)}</b> change.
            </p>
          </section>

          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Top Drivers</p>
            <p className="mt-2 text-sm text-slate-800">
              Breadth <b>{advances}</b> up / <b>{declines}</b> down.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Volume Spike</p>
            <p className="mt-2 text-sm text-slate-800">
              <b>{volumeLeaderSymbol ?? "--"}</b> leads turnover with total volume at <b>{formatVolume(totalVolume)}</b>.
            </p>
          </section>
        </div>
      </aside>
    );
  }

  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold text-slate-900">Insights Panel</h3>
        <p className="text-xs uppercase tracking-[0.2em] text-blue-600">AI + Fundamentals</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Sector Spot</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{formatPrice(sectorSpot)}</p>
        </article>
        <article className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-blue-700">Average Change</p>
          <p className="mt-2 text-lg font-semibold text-blue-700">{formatPercent(averageChange)}</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Breadth</p>
          <p className="mt-2 text-lg font-semibold text-emerald-700">
            {advances} / {declines}
          </p>
          <p className="text-xs text-emerald-700/80">Advancers / Decliners</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Traded Volume</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{formatVolume(totalVolume)}</p>
        </article>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-blue-700">Signal 01</p>
          <p className="mt-2 text-sm text-slate-800">
            Momentum is {averageChange >= 0 ? "positive" : "negative"} with <b>{advances}</b> advancing symbols.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Signal 02</p>
          <p className="mt-2 text-sm text-slate-700">
            Volume concentration is highest in <b>{volumeLeaderSymbol ?? "--"}</b>.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Signal 03</p>
          <p className="mt-2 text-sm text-slate-700">
            Watch continuation if sector spot holds above <b>{formatPrice(sectorSpot)}</b>.
          </p>
        </article>
      </div>
    </section>
  );
}
