function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

export default function SectorSummary({
  indexName,
  requestedIndex,
  fallbackIndexUsed,
  lastPrice,
  percentChange,
  advanceDecline,
  marketStatus
}) {
  const isPositive = Number.isFinite(percentChange) ? percentChange >= 0 : true;

  return (
    <section className="rounded-2xl border border-dashboard-border/80 bg-dashboard-panel/90 p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Sector Summary</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-white">{indexName || "NIFTY POWER"}</h2>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            marketStatus?.isOpen
              ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
              : "border-rose-400/60 bg-rose-500/20 text-rose-200"
          }`}
        >
          {marketStatus?.label || "--"}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold text-white">{formatNumber(lastPrice)}</p>
          <p className={`mt-2 text-sm font-semibold ${isPositive ? "text-dashboard-positive" : "text-dashboard-negative"}`}>
            {Number.isFinite(percentChange) ? `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(2)}%` : "--"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-2">
            <p className="text-slate-400">Advance</p>
            <p className="mt-1 font-semibold text-emerald-300">{advanceDecline?.advances ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-2">
            <p className="text-slate-400">Decline</p>
            <p className="mt-1 font-semibold text-rose-300">{advanceDecline?.declines ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-2">
            <p className="text-slate-400">Flat</p>
            <p className="mt-1 font-semibold text-slate-200">{advanceDecline?.unchanged ?? 0}</p>
          </div>
        </div>
      </div>

      {fallbackIndexUsed && (
        <p className="mt-3 rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          Requested index {requestedIndex || "NIFTY POWER"} is unavailable in NSE feed right now.
          Using {indexName || "NIFTY ENERGY"} as nearest live sector benchmark.
        </p>
      )}
    </section>
  );
}
