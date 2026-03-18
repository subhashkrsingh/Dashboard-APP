import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatPrice } from "../../lib/formatters";
import { fetchSectorIntraday } from "../../services/sectorApi";

interface SectorIntradayChartProps {
  sectorId: string;
  title?: string;
  week52High?: number | null;
  week52Low?: number | null;
  intradayHigh?: number | null;
  intradayLow?: number | null;
}

interface ChartDataPoint {
  time: string;
  value: number;
}

const TIME_FILTERS = [
  { label: "1D", value: "1D", active: true },
  { label: "1W", value: "1W", active: false },
  { label: "1M", value: "1M", active: false },
  { label: "3M", value: "3M", active: false }
];

function formatRange(low?: number | null, high?: number | null) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return "--";
  }

  return `${formatPrice(low)} - ${formatPrice(high)}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Session time</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-2 text-sm text-slate-600">Index value {formatPrice(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export function SectorIntradayChart({
  sectorId,
  title = "Sector Intraday Trend",
  week52High,
  week52Low,
  intradayHigh,
  intradayLow
}: SectorIntradayChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["intraday", sectorId],
    queryFn: () => fetchSectorIntraday(sectorId, title),
    refetchInterval: 60000
  });

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data) return [];
    return data.time.map((time, index) => ({
      time,
      value: data.value[index]
    }));
  }, [data]);
  const openingValue = chartData[0]?.value ?? null;
  const currentValue = chartData[chartData.length - 1]?.value ?? null;
  const absoluteChange =
    openingValue !== null && currentValue !== null ? Number((currentValue - openingValue).toFixed(2)) : null;
  const percentChange =
    openingValue && currentValue !== null ? Number((((currentValue - openingValue) / openingValue) * 100).toFixed(2)) : null;
  const isPositiveSession = (percentChange ?? 0) >= 0;
  const strokeColor = isPositiveSession ? "#16a34a" : "#2563eb";
  const gradientId = `intraday-gradient-${sectorId}`;

  if (isLoading) {
    return (
      <div className="glass-card rounded-[28px] border border-[#E6EAF2] p-6">
        <div className="animate-pulse">
          <div className="h-4 w-1/4 rounded bg-slate-200" />
          <div className="mt-4 h-9 w-1/3 rounded bg-slate-200" />
          <div className="mt-6 h-72 rounded-[24px] bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-[28px] border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm font-semibold text-rose-700">Failed to load intraday data</p>
        <p className="mt-2 text-sm text-rose-700/80">
          {error instanceof Error ? error.message : "The intraday feed is temporarily unavailable."}
        </p>
      </div>
    );
  }

  return (
    <section className="glass-card rounded-[28px] border border-[#E6EAF2] p-5 md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-blue-600">Intraday View</p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">{title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Source {String(data?.source ?? "live").toUpperCase()}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Session {percentChange === null ? "--" : `${isPositiveSession ? "+" : ""}${percentChange.toFixed(2)}%`}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Move {absoluteChange === null ? "--" : formatPrice(absoluteChange)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TIME_FILTERS.map(filter => (
            <button
              key={filter.value}
              type="button"
              className={`px-3 py-1 text-sm rounded ${
                filter.active
                  ? "border border-slate-900 bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-500"
              }`}
              disabled={!filter.active}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Opening</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatPrice(openingValue)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatPrice(currentValue)}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-700">Day Range</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatRange(intradayLow, intradayHigh)}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">52W Range</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatRange(week52Low, week52High)}</p>
        </article>
      </div>

      <div className="mt-5 h-[320px] rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,0.9)_100%)] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.28} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748B" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748B" }}
              tickFormatter={value => formatPrice(Number(value))}
              width={92}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
