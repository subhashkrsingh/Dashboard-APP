function formatPercent(value) {
  if (!Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function tileStyle(percentChange) {
  if (!Number.isFinite(percentChange)) {
    return {
      backgroundColor: "rgba(15, 23, 42, 0.82)",
      borderColor: "rgba(71, 85, 105, 0.55)"
    };
  }

  const intensity = Math.min(Math.abs(percentChange) / 6, 1);
  if (percentChange >= 0) {
    return {
      backgroundColor: `rgba(34, 197, 94, ${0.16 + intensity * 0.42})`,
      borderColor: `rgba(74, 222, 128, ${0.55 + intensity * 0.35})`
    };
  }

  return {
    backgroundColor: `rgba(239, 68, 68, ${0.16 + intensity * 0.42})`,
    borderColor: `rgba(248, 113, 113, ${0.55 + intensity * 0.35})`
  };
}

export default function SectorHeatmap({ companies }) {
  return (
    <section className="rounded-2xl border border-dashboard-border/80 bg-dashboard-panel/90 p-5 shadow-glow">
      <h3 className="font-display text-lg font-semibold text-white">Sector Heatmap</h3>
      <p className="mt-1 text-xs text-slate-400">Color intensity tracks intraday % move.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(companies || []).map(company => (
          <div
            key={`heat-${company.symbol}`}
            className="rounded-lg border p-2.5 text-xs transition"
            style={tileStyle(company.percentChange)}
            title={`${company.company}: ${formatPercent(company.percentChange)}`}
          >
            <p className="font-semibold text-slate-100">{company.symbol}</p>
            <p className="mt-1 text-slate-100/90">{formatPercent(company.percentChange)}</p>
          </div>
        ))}

        {(!companies || companies.length === 0) && (
          <div className="col-span-2 rounded-lg border border-slate-700/70 bg-slate-900/60 p-3 text-sm text-slate-400">
            Heatmap unavailable.
          </div>
        )}
      </div>
    </section>
  );
}
