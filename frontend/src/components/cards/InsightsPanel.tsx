import { formatPercent, formatPrice, formatVolume } from "../../lib/formatters";

interface InsightsPanelProps {
  sectorSpot: number | null;
  averageChange: number;
  advances: number;
  declines: number;
  totalVolume: number;
  volumeLeaderSymbol?: string;
}

export function InsightsPanel({
  sectorSpot,
  averageChange,
  advances,
  declines,
  totalVolume,
  volumeLeaderSymbol
}: InsightsPanelProps) {
  return (
    <section className="glass-card rounded-2xl border border-slate-700/70 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold text-slate-100">Insights Panel</h3>
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">AI + Fundamentals</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-700/70 bg-[#0B1220]/75 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sector Spot</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{formatPrice(sectorSpot)}</p>
        </article>
        <article className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-100">Average Change</p>
          <p className="mt-2 text-lg font-semibold text-cyan-50">{formatPercent(averageChange)}</p>
        </article>
        <article className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">Breadth</p>
          <p className="mt-2 text-lg font-semibold text-emerald-50">
            {advances} / {declines}
          </p>
          <p className="text-xs text-emerald-200/80">Advancers / Decliners</p>
        </article>
        <article className="rounded-xl border border-slate-700/70 bg-[#0B1220]/75 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Traded Volume</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{formatVolume(totalVolume)}</p>
        </article>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-100">Signal 01</p>
          <p className="mt-2 text-sm text-slate-100">
            Momentum is {averageChange >= 0 ? "positive" : "negative"} with <b>{advances}</b> advancing symbols.
          </p>
        </article>
        <article className="rounded-xl border border-slate-700/70 bg-[#0B1220]/75 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Signal 02</p>
          <p className="mt-2 text-sm text-slate-200">
            Volume concentration is highest in <b>{volumeLeaderSymbol ?? "--"}</b>.
          </p>
        </article>
        <article className="rounded-xl border border-slate-700/70 bg-[#0B1220]/75 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Signal 03</p>
          <p className="mt-2 text-sm text-slate-200">
            Watch continuation if sector spot holds above <b>{formatPrice(sectorSpot)}</b>.
          </p>
        </article>
      </div>
    </section>
  );
}
