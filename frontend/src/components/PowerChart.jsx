import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function formatPrice(value) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default function PowerChart({ points, currentPrice, percentChange }) {
  const hasPoints = Array.isArray(points) && points.length > 1;
  const lineColor = Number.isFinite(percentChange) && percentChange < 0 ? "#ef4444" : "#22c55e";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">Live Sector Chart</h3>
          <p className="text-sm text-slate-400">Auto-updates every 10 seconds</p>
        </div>
        <div className="rounded-full border border-cyan-400/45 bg-cyan-500/10 px-4 py-1.5 text-sm font-semibold text-cyan-200">
          Spot {formatPrice(currentPrice)}
        </div>
      </div>

      <div className="h-72 w-full rounded-xl border border-slate-700/60 bg-slate-950/70 p-2">
        {!hasPoints ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Waiting for price ticks to build the live chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 16, right: 18, left: 8, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="time" stroke="#94a3b8" minTickGap={24} tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={value => formatPrice(value)}
              />
              <Tooltip
                formatter={value => [formatPrice(value), "Index"]}
                contentStyle={{
                  backgroundColor: "#0b1220",
                  border: "1px solid #334155",
                  borderRadius: "0.75rem",
                  color: "#e2e8f0"
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
