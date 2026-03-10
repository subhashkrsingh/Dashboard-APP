function formatPrice(value) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default function MarketMovers({ title, rows, positive }) {
  const accentClass = positive
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
    : "border-rose-400/35 bg-rose-500/10 text-rose-200";

  return (
    <section className="rounded-2xl border border-dashboard-border/80 bg-dashboard-panel/90 p-5 shadow-glow">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${accentClass}`}>
          {rows?.length || 0} stocks
        </span>
      </div>

      <div className="space-y-2">
        {(rows || []).map(stock => {
          const isUp = Number.isFinite(stock.percentChange) ? stock.percentChange >= 0 : positive;
          return (
            <div
              key={`${title}-${stock.symbol}`}
              className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">{stock.company || stock.symbol}</p>
                <p className="text-xs text-slate-400">{stock.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-100">{formatPrice(stock.price)}</p>
                <p className={`text-xs font-semibold ${isUp ? "text-dashboard-positive" : "text-dashboard-negative"}`}>
                  {Number.isFinite(stock.percentChange)
                    ? `${stock.percentChange >= 0 ? "+" : ""}${stock.percentChange.toFixed(2)}%`
                    : "--"}
                </p>
              </div>
            </div>
          );
        })}

        {(!rows || rows.length === 0) && (
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-4 text-sm text-slate-400">
            No movers available.
          </div>
        )}
      </div>
    </section>
  );
}
