import { useMemo, type ReactNode } from "react";
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
import { List, type RowComponentProps } from "react-window";

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

const HEATMAP_CITY_COLUMN_WIDTH = 160;
const HEATMAP_CELL_WIDTH = 110;
const HEATMAP_ROW_HEIGHT = 42;
const HEATMAP_BODY_HEIGHT = 500;
const HEATMAP_MIN_WIDTH = 1200;

type QuarterlyGrowthHeatmapRowData = {
  rows: Array<{ city: string; values: Array<{ quarter: string; value: number }> }>;
  selectedCityLabel: string;
  totalWidth: number;
};

function getHeatmapCellTone(value: number) {
  if (value > 0.1) return "bg-emerald-100 text-emerald-700";
  if (value < -0.1) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function QuarterlyGrowthHeatmapRow({
  index,
  style,
  rows,
  selectedCityLabel,
  totalWidth
}: RowComponentProps<QuarterlyGrowthHeatmapRowData>) {
  const row = rows[index];
  const stickyCityClass =
    row.city === selectedCityLabel
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-slate-200 bg-white text-slate-800 group-hover:bg-slate-50";

  return (
    <div
      style={{ ...style, width: totalWidth }}
      className="group flex w-max"
    >
      <div
        className={`sticky left-0 z-10 flex h-[42px] items-center border-b border-r px-3 text-sm font-medium whitespace-nowrap ${stickyCityClass}`}
        style={{ width: HEATMAP_CITY_COLUMN_WIDTH, minWidth: HEATMAP_CITY_COLUMN_WIDTH }}
      >
        {row.city}
      </div>
      {row.values.map(cell => (
        <div
          key={`${row.city}-${cell.quarter}`}
          className={`flex h-[42px] items-center justify-center border-b border-r px-3 py-2 text-sm text-center whitespace-nowrap ${getHeatmapCellTone(
            cell.value
          )}`}
          style={{ width: HEATMAP_CELL_WIDTH, minWidth: HEATMAP_CELL_WIDTH }}
        >
          {formatPercent(cell.value)}
        </div>
      ))}
    </div>
  );
}

function QuarterlyGrowthHeatmapTable({
  heatmapColumns,
  heatmapRows,
  selectedCityLabel
}: {
  heatmapColumns: string[];
  heatmapRows: Array<{ city: string; values: Array<{ quarter: string; value: number }> }>;
  selectedCityLabel: string;
}) {
  const totalWidth = Math.max(
    HEATMAP_MIN_WIDTH,
    HEATMAP_CITY_COLUMN_WIDTH + heatmapColumns.length * HEATMAP_CELL_WIDTH
  );
  const rowProps = useMemo(
    () => ({
      rows: heatmapRows,
      selectedCityLabel,
      totalWidth
    }),
    [heatmapRows, selectedCityLabel, totalWidth]
  );

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full align-top">
        <div
          className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80"
          style={{ width: totalWidth }}
        >
        <div className="sticky top-0 z-20 border-b bg-white dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex w-max" style={{ width: totalWidth }}>
            <div
              className="sticky left-0 z-30 flex h-[42px] items-center border-r px-3 text-sm font-semibold text-slate-800 whitespace-nowrap bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              style={{ width: HEATMAP_CITY_COLUMN_WIDTH, minWidth: HEATMAP_CITY_COLUMN_WIDTH }}
            >
              City
            </div>
          {heatmapColumns.map(column => (
            <div
              key={column}
              className="flex h-[42px] items-center justify-center border-r px-3 py-2 text-sm font-semibold text-center text-slate-700 whitespace-nowrap bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              style={{ width: HEATMAP_CELL_WIDTH, minWidth: HEATMAP_CELL_WIDTH }}
            >
              {formatResidexShortPeriod(column)}
            </div>
          ))}
          </div>
        </div>

        <div className="overflow-x-hidden" style={{ width: totalWidth }}>
          <List
            rowComponent={QuarterlyGrowthHeatmapRow}
            rowCount={heatmapRows.length}
            rowHeight={HEATMAP_ROW_HEIGHT}
            rowProps={rowProps}
            overscanCount={8}
            className="w-full overflow-x-hidden"
            style={{ height: HEATMAP_BODY_HEIGHT, width: totalWidth, overflowX: "hidden" }}
          />
        </div>
      </div>
      </div>
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
          description={`All cities for ${selectedPeriodLabel}, sorted by ${comparisonSortLabel.toLowerCase()}.`}
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
          <QuarterlyGrowthHeatmapTable
            heatmapColumns={heatmapColumns}
            heatmapRows={heatmapRows}
            selectedCityLabel={selectedCityLabel}
          />
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
