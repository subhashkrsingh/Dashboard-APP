import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from "recharts";

function calculateRange(series) {
  if (!series || series.length === 0) {
    return { low: 0, high: 0, last: 0, percent: 0 };
  }

  const values = series.map(point => point.price);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const last = values[values.length - 1];
  const percent = high !== low ? ((last - low) / (high - low)) * 100 : 50;

  return { low, high, last, percent };
}

export default function IntradayChart({ symbol, series }) {
  if (!series || series.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Intraday Chart</div>
        <p className="empty">Waiting for live ticks...</p>
      </div>
    );
  }

  const latest = series[series.length - 1];
  const range = calculateRange(series);

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div>
          <div className="card-title">Intraday Chart</div>
          <p className="muted">{symbol} price action</p>
        </div>
        <div className="price-chip">INR {latest.price.toFixed(2)}</div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={series}>
          <defs>
            <linearGradient id="priceGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0b0f14" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis
            yAxisId="price"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            domain={["dataMin", "dataMax"]}
          />
          <YAxis yAxisId="volume" orientation="right" hide />
          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
          <Bar yAxisId="volume" dataKey="volume" barSize={10}>
            {series.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isUp ? "rgba(0, 200, 83, 0.25)" : "rgba(255, 82, 82, 0.22)"}
              />
            ))}
          </Bar>
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke="#7dd3fc"
            strokeWidth={2.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="range-bar">
        <div className="range-label">Today's Range</div>
        <div className="range-track">
          <div className="range-fill" style={{ width: `${range.percent}%` }} />
          <div className="range-dot" style={{ left: `${range.percent}%` }} />
        </div>
        <div className="range-values">
          <span>Low INR {range.low.toFixed(2)}</span>
          <span>High INR {range.high.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
