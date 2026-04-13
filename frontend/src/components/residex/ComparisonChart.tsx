import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

import { formatResidexValue, useResidexContext } from "./ResidexContext";

const CITY_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
];

interface ComparisonChartProps {
  className?: string;
}

function ComparisonChartComponent({ className = "" }: ComparisonChartProps) {
  const { comparison, tableRows, periods } = useResidexContext();
  const [hiddenCities, setHiddenCities] = useState<Set<string>>(new Set());

  const chartData = useMemo(() => {
    if (!comparison.isEnabled || comparison.selectedCities.length === 0) {
      return [];
    }

    // Get data for selected cities across all periods
    const cityData: Record<string, any[]> = {};

    comparison.selectedCities.forEach(city => {
      cityData[city] = periods.map(period => {
        const record = tableRows.find((r: any) => r.city === city && r.quarter === period.label);
        return {
          quarter: period.label,
          shortLabel: `${period.quarterCode}'${period.year.toString().slice(-2)}`,
          [city]: record?.residex || 0
        };
      });
    });

    // Merge data by quarter
    const mergedData: Record<string, any> = {};

    periods.forEach(period => {
      const quarterData = {
        quarter: period.label,
        shortLabel: `${period.quarterCode}'${period.year.toString().slice(-2)}`
      };

      comparison.selectedCities.forEach(city => {
        const cityRecord = tableRows.find((r: any) => r.city === city && r.quarter === period.label);
        (quarterData as any)[city] = cityRecord?.residex || 0;
      });

      mergedData[period.label] = quarterData;
    });

    return Object.values(mergedData);
  }, [comparison, tableRows, periods]);

  const toggleCityVisibility = (city: string) => {
    setHiddenCities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(city)) {
        newSet.delete(city);
      } else {
        newSet.add(city);
      }
      return newSet;
    });
  };

  if (!comparison.isEnabled || comparison.selectedCities.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className={`glass-card rounded-2xl border border-slate-800 bg-slate-950/90 p-6 ${className}`}
    >
      <div className="mb-6">
        <h3 className="font-display text-lg font-semibold text-white">
          City Comparison Chart
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Compare RESIDEX trends across selected cities
        </p>
      </div>

      <div className="h-80 w-full">
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
            <Legend
              onClick={(entry) => toggleCityVisibility(entry.value)}
              wrapperStyle={{ paddingTop: '20px' }}
            />

            {comparison.selectedCities.map((city, index) => {
              const color = CITY_COLORS[index % CITY_COLORS.length];
              const isHidden = hiddenCities.has(city);

              return (
                <Line
                  key={city}
                  type="monotone"
                  dataKey={city}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                  hide={isHidden}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with toggle buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {comparison.selectedCities.map((city, index) => {
          const color = CITY_COLORS[index % CITY_COLORS.length];
          const isHidden = hiddenCities.has(city);

          return (
            <motion.button
              key={city}
              onClick={() => toggleCityVisibility(city)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isHidden
                  ? 'bg-slate-800 text-slate-500 border border-slate-700'
                  : 'bg-slate-800 text-white border border-slate-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: isHidden ? '#6b7280' : color }}
              />
              {city}
              {isHidden && <span className="text-xs">(hidden)</span>}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export const ComparisonChart = memo(ComparisonChartComponent);