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

interface ResidexComparisonChartProps {
  cities: Array<{
    city: string;
    data: Array<{
      quarter: string;
      overall: number;
      affordable: number;
      premium: number;
    }>;
  }>;
  height?: number;
  showAffordable?: boolean;
  showPremium?: boolean;
  showOverall?: boolean;
}

export const ResidexComparisonChart = memo(function ResidexComparisonChart({
  cities,
  height = 300,
  showAffordable = true,
  showPremium = true,
  showOverall = true
}: ResidexComparisonChartProps) {
  // Transform data for the chart - combine all cities' data by quarter
  const chartData = cities[0]?.data.map((_, index) => {
    const dataPoint: any = {
      quarter: cities[0].data[index].quarter,
      shortLabel: cities[0].data[index].quarter.replace(/^Q(\d)-(\d{4})$/, 'Q$1\'$2'.slice(-2))
    };

    cities.forEach(city => {
      const cityData = city.data[index];
      if (cityData) {
        if (showOverall) dataPoint[`${city.city} Overall`] = cityData.overall;
        if (showAffordable) dataPoint[`${city.city} Affordable`] = cityData.affordable;
        if (showPremium) dataPoint[`${city.city} Premium`] = cityData.premium;
      }
    });

    return dataPoint;
  }) || [];

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

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

          {cities.map((city, cityIndex) => {
            const color = colors[cityIndex % colors.length];
            const lines = [];

            if (showOverall) {
              lines.push(
                <Line
                  key={`${city.city} Overall`}
                  type="monotone"
                  dataKey={`${city.city} Overall`}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: color, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: color, strokeWidth: 2 }}
                  name={`${city.city} Overall`}
                />
              );
            }

            if (showAffordable) {
              lines.push(
                <Line
                  key={`${city.city} Affordable`}
                  type="monotone"
                  dataKey={`${city.city} Affordable`}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                  name={`${city.city} Affordable`}
                />
              );
            }

            if (showPremium) {
              lines.push(
                <Line
                  key={`${city.city} Premium`}
                  type="monotone"
                  dataKey={`${city.city} Premium`}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={{ fill: color, strokeWidth: 1, r: 2 }}
                  activeDot={{ r: 4, stroke: color, strokeWidth: 1 }}
                  name={`${city.city} Premium`}
                />
              );
            }

            return lines;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});