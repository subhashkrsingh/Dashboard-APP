import { formatPercent } from "../../lib/formatters";

interface TrendIndicatorProps {
  value: number | null | undefined;
  withArrow?: boolean;
}

function getDirection(value: number | null | undefined) {
  if (!Number.isFinite(value) || Number(value) === 0) return "flat";
  return Number(value) > 0 ? "up" : "down";
}

export function TrendIndicator({ value, withArrow = true }: TrendIndicatorProps) {
  const direction = getDirection(value);

  if (direction === "flat") {
    return <span className="text-sm font-semibold text-slate-300">{formatPercent(value)}</span>;
  }

  const arrow = direction === "up" ? "^" : "v";
  const tone = direction === "up" ? "text-emerald-300" : "text-rose-300";

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${tone}`}>
      {withArrow ? <span className="text-xs">{arrow}</span> : null}
      {formatPercent(value)}
    </span>
  );
}
