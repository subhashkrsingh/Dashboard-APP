import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatPercent, formatPrice } from "../../lib/formatters";
import type { SectorIndex, TimePoint } from "../../types/market";
import { TrendIndicator } from "../ui/TrendIndicator";

interface SectorChartProps {
  sectorIndex: SectorIndex;
  history: TimePoint[];
}

const RANGES = [
  { label: "30P", points: 30 },
  { label: "60P", points: 60 },
  { label: "120P", points: 120 },
  { label: "ALL", points: 0 }
] as const;

export function SectorChart({ sectorIndex, history }: SectorChartProps) {
  const [range, setRange] = useState<(typeof RANGES)[number]["points"]>(120);
  const isPositive = (sectorIndex.percentChange ?? 0) >= 0;

  const chartData = useMemo(() => {
    if (range === 0) return history;
    return history.slice(-range);
  }, [history, range]);

  const strokeColor = isPositive ? "#22C55E" : "#EF4444";

  return (
    <section className="glass-card rounded-2xl border border-slate-700/70 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/90">Hero Chart</p>
          <h2 className="font-display text-xl font-semibold text-slate-100">Sector Intraday Chart</h2>
          <p className="text-xs text-slate-400">Live movement of {sectorIndex.name || "NIFTY POWER"}</p>
        </div>

        <div className="text-right">
          <p className="text-xl font-semibold text-slate-100">{formatPrice(sectorIndex.lastPrice)}</p>
          <div className="mt-1 flex items-center justify-end gap-2">
            <TrendIndicator value={sectorIndex.percentChange} />
            <span className="text-xs text-slate-400">{formatPercent(sectorIndex.percentChange)}</span>
          </div>
        </div>
      </div>

      <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-950/70 p-1 text-xs">
        {RANGES.map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => setRange(item.points)}
            className={`rounded-full px-3 py-1.5 transition ${
              range === item.points
                ? "bg-cyan-500/25 text-cyan-100 shadow-[0_0_0_1px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="h-[360px] rounded-xl border border-slate-700/70 bg-[#0B1220]/65 p-2">
        {chartData.length < 2 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Waiting for intraday points...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 6, bottom: 6 }}>
              <defs>
                <linearGradient id="sector-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1F2A44" strokeDasharray="4 4" />
              <XAxis dataKey="time" stroke="#9CAEC9" tick={{ fontSize: 11 }} minTickGap={22} />
              <YAxis
                stroke="#9CAEC9"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={value => formatPrice(Number(value))}
              />
              <Tooltip
                formatter={(value: number | string) => [formatPrice(Number(value)), "Index"]}
                labelFormatter={label => `Time: ${label}`}
                contentStyle={{
                  background: "#111A2C",
                  border: "1px solid #1F2A44",
                  borderRadius: "12px",
                  color: "#E2E8F0"
                }}
              />
              <Area
                type="monotone"
                dataKey="sectorPrice"
                stroke="none"
                fill="url(#sector-chart-fill)"
                isAnimationActive
                animationDuration={500}
              />
              <Line
                type="monotone"
                dataKey="sectorPrice"
                stroke={strokeColor}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive
                animationDuration={450}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
