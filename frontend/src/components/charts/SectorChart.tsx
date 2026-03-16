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
  title?: string;
  subtitle?: string;
  waitingLabel?: string;
}

const RANGES = [
  { label: "1D", points: 40 },
  { label: "1W", points: 80 },
  { label: "1M", points: 120 },
  { label: "ALL", points: 0 }
] as const;

export function SectorChart({
  sectorIndex,
  history,
  title = "Energy Sector Intraday Trend",
  subtitle,
  waitingLabel = "Waiting for intraday points..."
}: SectorChartProps) {
  const [range, setRange] = useState<(typeof RANGES)[number]["points"]>(40);
  const isPositive = (sectorIndex.percentChange ?? 0) >= 0;

  const chartData = useMemo(() => {
    const baseData = range === 0 ? history : history.slice(-range);

    if (baseData.length !== 1) {
      return baseData;
    }

    const firstPoint = baseData[0];
    return [
      firstPoint,
      {
        ...firstPoint,
        isoTime: `${firstPoint.isoTime}-placeholder`,
        time: "Now"
      }
    ];
  }, [history, range]);

  const strokeColor = isPositive ? "#22C55E" : "#EF4444";

  return (
    <section className="glass-card w-full rounded-2xl border border-[#E6EAF2] p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-600">Hero Chart</p>
          <h2 className="font-display text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle ?? `Live movement of ${sectorIndex.name || "SECTOR INDEX"}`}</p>
        </div>

        <div className="text-right">
          <p className="text-xl font-semibold text-slate-900">{formatPrice(sectorIndex.lastPrice)}</p>
          <div className="mt-1 flex items-center justify-end gap-2">
            <TrendIndicator value={sectorIndex.percentChange} />
            <span className="text-xs text-slate-500">{formatPercent(sectorIndex.percentChange)}</span>
          </div>
        </div>
      </div>

      <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-xs">
        {RANGES.map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => setRange(item.points)}
            className={`rounded-full px-3 py-1.5 transition ${
              range === item.points
                ? "bg-blue-600 text-white shadow-[0_0_0_1px_rgba(37,99,235,0.35)]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="h-[460px] w-full rounded-xl border border-slate-200 bg-white p-2">
        {chartData.length < 2 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            {waitingLabel}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 2, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id="sector-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
              <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 11 }} minTickGap={20} />
              <YAxis
                stroke="#64748B"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={value => formatPrice(Number(value))}
              />
              <Tooltip
                formatter={(value: number | string) => [formatPrice(Number(value)), "Index"]}
                labelFormatter={label => `Time: ${label}`}
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  color: "#0F172A"
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
