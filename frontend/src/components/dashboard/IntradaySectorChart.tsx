import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatPercent, formatPrice } from "../../lib/formatters";
import type { SectorIndex, TimePoint } from "../../types/market";

interface IntradaySectorChartProps {
  sectorIndex: SectorIndex;
  history: TimePoint[];
}

export function IntradaySectorChart({ sectorIndex, history }: IntradaySectorChartProps) {
  const isPositive = (sectorIndex.percentChange ?? 0) >= 0;

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-100">Intraday Sector Chart</h3>
          <p className="text-xs text-slate-400">NIFTY POWER index track (updates every 10s)</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-100">{formatPrice(sectorIndex.lastPrice)}</p>
          <p className={`text-sm font-semibold ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
            {formatPercent(sectorIndex.percentChange)}
          </p>
        </div>
      </div>

      <div className="h-72 rounded-xl border border-slate-800/90 bg-slate-950/70 p-2">
        {history.length < 2 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Waiting for intraday points...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 14, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={value => formatPrice(value)}
              />
              <Tooltip
                formatter={value => [formatPrice(Number(value)), "Index"]}
                labelFormatter={label => `Time: ${label}`}
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  color: "#e2e8f0"
                }}
              />
              <Line
                type="monotone"
                dataKey="sectorPrice"
                stroke={isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth={2.4}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
