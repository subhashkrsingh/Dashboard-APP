import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatPercent, formatPrice } from "../../lib/formatters";
import type { CompanyQuote } from "../../types/market";
import type { CompanyHistoryPoint } from "../../hooks/useMarketHistory";

interface CompanyComparisonChartProps {
  companies: CompanyQuote[];
  historyBySymbol: Record<string, CompanyHistoryPoint[]>;
}

type MetricMode = "price" | "growth";

const LINE_COLORS = ["#06b6d4", "#22c55e", "#f59e0b"];

export function CompanyComparisonChart({ companies, historyBySymbol }: CompanyComparisonChartProps) {
  const defaultSelection = useMemo(() => companies.slice(0, 3).map(company => company.symbol), [companies]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(defaultSelection);
  const [metric, setMetric] = useState<MetricMode>("growth");

  useEffect(() => {
    if (selectedSymbols.length === 0 && defaultSelection.length > 0) {
      setSelectedSymbols(defaultSelection);
    }
  }, [defaultSelection, selectedSymbols.length]);

  const rows = useMemo(() => {
    if (selectedSymbols.length === 0) return [] as Array<Record<string, string | number | null>>;

    const timeSet = new Set<string>();
    const seriesBySymbol = selectedSymbols
      .map(symbol => ({ symbol, data: historyBySymbol[symbol] ?? [] }))
      .filter(entry => entry.data.length > 0);

    seriesBySymbol.forEach(entry => {
      entry.data.forEach(point => timeSet.add(point.isoTime));
    });

    const sortedTimes = Array.from(timeSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedTimes.map(isoTime => {
      const row: Record<string, string | number | null> = {
        time: seriesBySymbol.find(item => item.data.find(point => point.isoTime === isoTime))?.data.find(
          point => point.isoTime === isoTime
        )?.time ?? isoTime,
        isoTime
      };

      seriesBySymbol.forEach(({ symbol, data }) => {
        const point = data.find(item => item.isoTime === isoTime);
        if (!point) {
          row[symbol] = null;
          return;
        }

        if (metric === "price") {
          row[symbol] = point.price;
          return;
        }

        const base = data[0]?.price ?? null;
        if (!Number.isFinite(base) || base === 0) {
          row[symbol] = null;
          return;
        }

        row[symbol] = ((point.price - base) / base) * 100;
      });

      return row;
    });
  }, [historyBySymbol, metric, selectedSymbols]);

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(previous => {
      if (previous.includes(symbol)) {
        return previous.filter(item => item !== symbol);
      }
      if (previous.length >= 3) {
        return previous;
      }
      return [...previous, symbol];
    });
  };

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-100">Company Comparison</h3>
          <p className="text-xs text-slate-400">Select up to 3 companies for relative movement</p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 p-1 text-xs">
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${metric === "growth" ? "bg-cyan-500/25 text-cyan-200" : "text-slate-400"}`}
            onClick={() => setMetric("growth")}
          >
            % Growth
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${metric === "price" ? "bg-cyan-500/25 text-cyan-200" : "text-slate-400"}`}
            onClick={() => setMetric("price")}
          >
            Price
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map(company => {
          const selected = selectedSymbols.includes(company.symbol);
          const disabled = !selected && selectedSymbols.length >= 3;

          return (
            <label
              key={company.symbol}
              className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                selected
                  ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                  : "border-slate-700 bg-slate-950/70 text-slate-300"
              } ${disabled ? "opacity-55" : ""}`}
            >
              <span>{company.symbol}</span>
              <input
                id={`compare-${company.symbol}`}
                name={`compare-${company.symbol}`}
                type="checkbox"
                checked={selected}
                onChange={() => toggleSymbol(company.symbol)}
                disabled={disabled}
                className="h-4 w-4"
              />
            </label>
          );
        })}
      </div>

      <div className="h-80 rounded-xl border border-slate-800/90 bg-slate-950/70 p-2">
        {rows.length < 2 || selectedSymbols.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Select companies and wait for data points.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, left: 2, bottom: 10 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={value => (metric === "growth" ? formatPercent(Number(value)) : formatPrice(Number(value)))}
              />
              <Tooltip
                formatter={(value, name) => {
                  const normalized = Array.isArray(value) ? value[0] : value;
                  if (!Number.isFinite(Number(normalized))) return ["--", String(name)];
                  return [
                    metric === "growth" ? formatPercent(Number(normalized)) : formatPrice(Number(normalized)),
                    String(name)
                  ];
                }}
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  color: "#e2e8f0"
                }}
              />
              <Legend />
              {selectedSymbols.map((symbol, index) => (
                <Line
                  key={symbol}
                  type="monotone"
                  dataKey={symbol}
                  stroke={LINE_COLORS[index % LINE_COLORS.length]}
                  strokeWidth={2.1}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
