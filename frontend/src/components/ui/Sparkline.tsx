import { useId, useMemo } from "react";

import type { CompanyHistoryPoint } from "../../hooks/useMarketHistory";

interface SparklineProps {
  points: CompanyHistoryPoint[];
  positive?: boolean;
}

function createPath(values: number[], width: number, height: number, padding: number) {
  if (values.length < 2) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function Sparkline({ points, positive = true }: SparklineProps) {
  const values = useMemo(() => points.map(point => point.price), [points]);
  const gradientId = useId().replace(/:/g, "");
  const width = 120;
  const height = 36;
  const padding = 3;
  const path = createPath(values, width, height, padding);
  const stroke = positive ? "#22C55E" : "#EF4444";

  if (values.length < 2 || !path) {
    return <span className="text-xs text-slate-500">No trend</span>;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.2" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
