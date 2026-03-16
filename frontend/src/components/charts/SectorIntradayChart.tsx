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

interface IntradayData {
  time: string[];
  value: number[];
}

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
  { label: "1M", value: "1M", active: false },
  { label: "3M", value: "3M", active: false },
  { label: "6M", value: "6M", active: false },
  { label: "1Y", value: "1Y", active: false },
  { label: "5Y", value: "5Y", active: false },
  { label: "10Y", value: "10Y", active: false },
  { label: "15Y", value: "15Y", active: false },
  { label: "20Y", value: "20Y", active: false },
  { label: "25Y", value: "25Y", active: false },
  { label: "30Y", value: "30Y", active: false }
];

async function fetchIntradayData(sectorId: string): Promise<IntradayData> {
  const response = await fetch(`/api/${sectorId}/intraday`);
  if (!response.ok) {
    throw new Error("Failed to fetch intraday data");
  }
  return response.json();
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900">{`Time: ${label}`}</p>
        <p className="text-sm text-gray-600">{`Value: ${payload[0].value.toLocaleString()}`}</p>
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
    queryFn: () => fetchIntradayData(sectorId),
    refetchInterval: 60000, // Refetch every minute
  });

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data) return [];
    return data.time.map((time, index) => ({
      time,
      value: data.value[index]
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-red-600">Failed to load intraday data</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex gap-2">
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={`px-3 py-1 text-sm rounded ${
                filter.active
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              disabled={!filter.active}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 mb-4 text-sm text-gray-600">
        {week52High && week52Low && (
          <div>
            <span className="font-medium">52 Week Range:</span>{" "}
            {week52Low.toLocaleString()} - {week52High.toLocaleString()}
          </div>
        )}
        {intradayHigh && intradayLow && (
          <div>
            <span className="font-medium">Intraday Range:</span>{" "}
            {intradayLow.toLocaleString()} - {intradayHigh.toLocaleString()}
          </div>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              domain={["dataMin - 50", "dataMax + 50"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#dc2626"
              strokeWidth={1.5}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}