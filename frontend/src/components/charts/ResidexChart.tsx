import { memo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { formatResidexValue } from "../residex/ResidexContext";

interface ResidexChartProps {
  data: Array<{
    quarter: string;
    overall: number;
    affordable: number;
    premium: number;
  }>;
  height?: number;
  showAffordable?: boolean;
  showPremium?: boolean;
  showOverall?: boolean;
}

export const ResidexChart = memo(function ResidexChart({
  data,
  height = 300,
  showAffordable = true,
  showPremium = true,
  showOverall = true
}: ResidexChartProps) {
  const chartData = data.map(item => ({
    ...item,
    shortLabel: item.quarter.replace(/^Q(\d)-(\d{4})$/, 'Q$1\'$2'.slice(-2))
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="shortLabel"
            stroke="#9ca3af"
            fontSize={12}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={12}
            tick={{ fill: '#9ca3af' }}
            tickFormatter={(value) => formatResidexValue(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f9fafb'
            }}
            labelStyle={{ color: '#f9fafb' }}
            formatter={(value: number, name: string) => [
              formatResidexValue(value),
              name
            ]}
          />

          {showOverall && (
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              name="Overall"
            />
          )}

          {showAffordable && (
            <Line
              type="monotone"
              dataKey="affordable"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              name="Affordable"
            />
          )}

          {showPremium && (
            <Line
              type="monotone"
              dataKey="premium"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
              name="Premium"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});