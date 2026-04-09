import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Badge } from "../ui/Badge";
import { formatPercent } from "../../lib/formatters";
import { formatResidexShortPeriod, formatResidexValue, useResidexContext, type ResidexMetricMode } from "./ResidexContext";

function ChartShell({
  id,
  title,
  description,
  action,
  children
}: {
  id?: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="glass-card w-full rounded-2xl border border-[#E6EAF2] p-4 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title font-display text-xl">{title}</h3>
          <p className="subtle-text mt-1">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function HeatCell({ value }: { value: number }) {
  const intensity = Math.min(Math.abs(value) / 6, 1);
  const hue = value >= 0 ? "16,185,129" : "244,63,94";
  const background = `rgba(${hue},${0.16 + intensity * 0.42})`;

  return (
    <div className="rounded-xl px-2 py-3 text-center text-xs font-semibold text-slate-700" style={{ backgroundColor: background }}>
      {formatPercent(value)}
    </div>
  );
}

export function ResidexCharts() {
  const {
    trendMode,
    comparisonSort,
    selectedCityLabel,
    selectedPeriodLabel,
    nationalTrend,
    comparisonRows,
    selectedCityTrend,
    heatmapColumns,
    heatmapRows,
    premiumHighlights,
    setTrendMode,
    setComparisonSort
  } = useResidexContext();

  const comparisonSortLabel =
    comparisonSort === "index" ? "Current Index" : comparisonSort === "qoq" ? "QoQ Growth" : "YoY Growth";

  return (
    <div className="space-y-4">
      <ChartShell
        title="National RESIDEX Trend"
        description="Quarterly multi-year track for the national residential composite, with a quick switch between affordable, premium, and overall lines."
        action={
          <div className="flex flex-wrap gap-2">
            {([
              { value: "overall", label: "Overall" },
              { value: "affordable", label: "Affordable" },
              { value: "premium", label: "Premium" }
            ] as Array<{ value: ResidexMetricMode; label: string }>).map(option => {
              const active = trendMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTrendMode(option.value)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        }
      >
        <div className="h-[320px] rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={nationalTrend} margin={{ top: 10, right: 18, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={value => formatResidexValue(value)} />
              <Tooltip
                formatter={value => [formatResidexValue(Number(value)), "Index"]}
                labelFormatter={label => `Period: ${label}`}
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  boxShadow: "0 12px 30px rgba(15,23,42,0.08)"
                }}
              />
              <Line
                type="monotone"
                dataKey={trendMode}
                name={trendMode === "overall" ? "Overall" : trendMode === "affordable" ? "Affordable" : "Premium"}
                stroke={trendMode === "overall" ? "#2563eb" : trendMode === "affordable" ? "#16a34a" : "#c2410c"}
                strokeWidth={3}
                dot={({ cx, cy, payload }) =>
                  payload.selected ? <circle cx={cx} cy={cy} r={5} fill="#0f172a" stroke="#ffffff" strokeWidth={2} /> : <circle cx={cx} cy={cy} r={0} />
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartShell>

      <section id="cities" className="flex w-full flex-col gap-6">
        <ChartShell
          title="City-wise Comparison"
          description={`Top 10 cities for ${selectedPeriodLabel}, sorted by ${comparisonSortLabel.toLowerCase()}.`}
          action={
            <div className="flex flex-wrap gap-2">
              {([
                { value: "index", label: "Current" },
                { value: "qoq", label: "QoQ" },
                { value: "yoy", label: "YoY" }
              ] as const).map(option => {
                const active = comparisonSort === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setComparisonSort(option.value)}
                    className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          }
        >
          <div className="h-[320px] w-full rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonRows} margin={{ top: 10, right: 10, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="city" stroke="#64748b" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={58} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={value => formatResidexValue(value)} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "value") {
                      return [formatResidexValue(Number(value)), "Index"];
                    }
                    return [formatPercent(Number(value)), name];
                  }}
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    boxShadow: "0 12px 30px rgba(15,23,42,0.08)"
                  }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {comparisonRows.map(row => (
                    <Cell key={row.city} fill={row.selected ? "#0f172a" : "#2563eb"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartShell>

        <ChartShell
          title="Quarterly Growth Heatmap"
          description="City vs quarter color map for growth momentum. Green tiles indicate acceleration and rose tiles flag cooling quarters."
          action={<Badge tone="warning">QoQ scale</Badge>}
        >
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
            <div
              className="grid min-w-[720px] gap-2 p-3"
              style={{ gridTemplateColumns: `160px repeat(${Math.max(heatmapColumns.length, 1)}, minmax(80px, 1fr))` }}
            >
              <div className="card-title text-xs">City</div>
              {heatmapColumns.map(column => (
                <div key={column} className="card-title text-center text-xs">
                  {formatResidexShortPeriod(column)}
                </div>
              ))}

              {heatmapRows.map(row => (
                <div
                  key={row.city}
                  className="contents"
                >
                  <div
                    className={`flex items-center rounded-xl border px-3 py-3 text-sm font-semibold ${
                      row.city === selectedCityLabel ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {row.city}
                  </div>
                  {row.values.map(cell => (
                    <HeatCell key={`${row.city}-${cell.quarter}`} value={cell.value} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </ChartShell>
      </section>

      <ChartShell
        id="affordable"
        title="Affordable vs Premium"
        description={`Dual-line comparison for ${selectedCityLabel}, keeping both housing tiers on the same quarterly timeline.`}
        action={<Badge tone="accent">{selectedCityLabel}</Badge>}
      >
        <div className="h-[320px] rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={selectedCityTrend} margin={{ top: 10, right: 18, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={value => formatResidexValue(value)} />
              <Tooltip
                formatter={(value, name) => [formatResidexValue(Number(value)), name]}
                labelFormatter={label => `Period: ${label}`}
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  boxShadow: "0 12px 30px rgba(15,23,42,0.08)"
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="affordable" stroke="#16a34a" strokeWidth={2.7} dot={false} name="Affordable" />
              <Line type="monotone" dataKey="premium" stroke="#c2410c" strokeWidth={2.7} dot={false} name="Premium" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartShell>

      <section id="premium" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {premiumHighlights.map(card => {
          const toneClasses =
            card.tone === "positive"
              ? "border-emerald-200 bg-emerald-50/80"
              : card.tone === "warning"
              ? "border-amber-200 bg-amber-50/80"
              : card.tone === "accent"
              ? "border-blue-200 bg-blue-50/80"
              : "border-slate-200 bg-white";

          return (
            <div key={card.title} className={`glass-card rounded-2xl border p-4 dark:border-slate-800 dark:bg-slate-950/80 ${toneClasses}`}>
              <p className="card-title text-[11px]">{card.title}</p>
              <p className="mt-3 font-display text-2xl font-semibold text-slate-900">{card.value}</p>
              <p className="subtle-text mt-2">{card.detail}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
