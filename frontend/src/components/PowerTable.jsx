import { useEffect, useMemo, useRef, useState } from "react";

function formatPrice(value) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value);
}

function sortByPercent(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export default function PowerTable({ companies }) {
  const [sortMode, setSortMode] = useState("gainers");
  const [flashBySymbol, setFlashBySymbol] = useState({});
  const previousBySymbol = useRef({});
  const clearFlashTimerRef = useRef(null);

  useEffect(() => {
    const nextPrices = {};
    const updates = {};

    (companies || []).forEach(company => {
      const key = company.symbol;
      const currentPrice = Number.isFinite(company.price) ? company.price : null;
      nextPrices[key] = currentPrice;

      const previousPrice = previousBySymbol.current[key];
      if (!Number.isFinite(previousPrice) || !Number.isFinite(currentPrice)) return;
      if (currentPrice === previousPrice) return;
      updates[key] = currentPrice > previousPrice ? "up" : "down";
    });

    previousBySymbol.current = nextPrices;

    if (Object.keys(updates).length === 0) return;

    setFlashBySymbol(prev => ({ ...prev, ...updates }));

    if (clearFlashTimerRef.current) clearTimeout(clearFlashTimerRef.current);
    clearFlashTimerRef.current = setTimeout(() => {
      setFlashBySymbol(prev => {
        const next = { ...prev };
        Object.keys(updates).forEach(key => delete next[key]);
        return next;
      });
    }, 850);
  }, [companies]);

  useEffect(() => {
    return () => {
      if (clearFlashTimerRef.current) clearTimeout(clearFlashTimerRef.current);
    };
  }, []);

  const sortedCompanies = useMemo(() => {
    const rows = [...(companies || [])];

    if (sortMode === "gainers") {
      rows.sort((a, b) => sortByPercent(b.percentChange, -Infinity) - sortByPercent(a.percentChange, -Infinity));
    } else if (sortMode === "losers") {
      rows.sort((a, b) => sortByPercent(a.percentChange, Infinity) - sortByPercent(b.percentChange, Infinity));
    } else if (sortMode === "volume") {
      rows.sort((a, b) => (b.volume ?? -Infinity) - (a.volume ?? -Infinity));
    } else {
      rows.sort((a, b) => String(a.company || "").localeCompare(String(b.company || "")));
    }

    return rows;
  }, [companies, sortMode]);

  const modes = [
    { id: "gainers", label: "Sort: Gainers" },
    { id: "losers", label: "Sort: Losers" },
    { id: "volume", label: "Sort: Volume" },
    { id: "alphabetical", label: "Sort: A-Z" }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">Power Company Table</h3>
          <p className="text-sm text-slate-400">Major NIFTY POWER constituents with live movement.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {modes.map(mode => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSortMode(mode.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                sortMode === mode.id
                  ? "border-cyan-300/80 bg-cyan-500/20 text-cyan-100"
                  : "border-slate-600/80 bg-slate-800/70 text-slate-300 hover:border-slate-400"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/70">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-900/95 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Change</th>
              <th className="px-4 py-3 text-right">% Change</th>
              <th className="px-4 py-3 text-right">Volume</th>
            </tr>
          </thead>
          <tbody className="bg-dashboard-panel/30">
            {sortedCompanies.map(company => {
              const isPositive = Number.isFinite(company.percentChange) && company.percentChange >= 0;
              const flashClass =
                flashBySymbol[company.symbol] === "up"
                  ? "animate-pulseUp"
                  : flashBySymbol[company.symbol] === "down"
                    ? "animate-pulseDown"
                    : "";

              return (
                <tr key={company.symbol} className={`border-t border-slate-800/90 ${flashClass}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-100">{company.company}</p>
                    <p className="text-xs text-slate-400">{company.symbol}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-100">{formatPrice(company.price)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${isPositive ? "text-dashboard-positive" : "text-dashboard-negative"}`}>
                    {Number.isFinite(company.change)
                      ? `${company.change >= 0 ? "+" : ""}${formatPrice(company.change)}`
                      : "--"}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isPositive ? "text-dashboard-positive" : "text-dashboard-negative"}`}>
                    {Number.isFinite(company.percentChange)
                      ? `${company.percentChange >= 0 ? "+" : ""}${company.percentChange.toFixed(2)}%`
                      : "--"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{formatNumber(company.volume)}</td>
                </tr>
              );
            })}

            {sortedCompanies.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No company data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
