import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import { toRaw, toPercentChange, toIndexed } from "../utils/normalize.js";

const palette = [
  "#4f46e5",
  "#22d3ee",
  "#38bdf8",
  "#f97316",
  "#a855f7",
  "#14b8a6"
];

export default function CompareChart({ data }) {
  const [mode, setMode] = useState("price");

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="card chart-card">
        <div className="card-title">Company Comparison</div>
        <p className="empty">Loading comparison...</p>
      </div>
    );
  }

  const symbols = Object.keys(data);
  const transformed = {};

  symbols.forEach(sym => {
    if (mode === "percent") transformed[sym] = toPercentChange(data[sym]);
    else if (mode === "indexed") transformed[sym] = toIndexed(data[sym]);
    else transformed[sym] = toRaw(data[sym]);
  });

  const chartData = transformed[symbols[0]].map((_, i) => {
    const row = { time: transformed[symbols[0]][i].time };
    symbols.forEach(sym => {
      row[sym] = transformed[sym][i]?.value ?? null;
    });
    return row;
  });

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div>
          <div className="card-title">Company Comparison</div>
          <p className="muted">Normalize performance to compare trajectories</p>
        </div>
        <select value={mode} onChange={e => setMode(e.target.value)}>
          <option value="price">Price (INR)</option>
          <option value="percent">% Change</option>
          <option value="indexed">Indexed (Base=100)</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
          <Legend />
          {symbols.map((sym, idx) => (
            <Line
              key={sym}
              type="monotone"
              dataKey={sym}
              dot={false}
              strokeWidth={2}
              stroke={palette[idx % palette.length]}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
