import type { SectorDataStatus } from "../../types/market";

interface FeedStatusIndicatorProps {
  dataStatus?: SectorDataStatus;
  cacheAgeMs?: number;
  isFetching?: boolean;
}

function getIndicatorCopy(dataStatus: SectorDataStatus | undefined, cacheAgeMs?: number) {
  if (dataStatus === "offline") {
    return {
      title: "🔴 Offline",
      label: "Market data temporarily unavailable",
      toneClass: "border-rose-200 bg-rose-50 text-rose-700"
    };
  }

  if (dataStatus === "cache") {
    const isRecent = !Number.isFinite(cacheAgeMs) || Number(cacheAgeMs) <= 30_000;
    return {
      title: "🟡 Recent Snapshot",
      label: isRecent ? "Updated just now" : "Showing recent snapshot",
      toneClass: "border-amber-200 bg-amber-50 text-amber-700"
    };
  }

  return {
    title: "🟢 Live Market",
    label: "Live market data",
    toneClass: "border-emerald-200 bg-emerald-50 text-emerald-700"
  };
}

export function FeedStatusIndicator({ dataStatus, cacheAgeMs, isFetching = false }: FeedStatusIndicatorProps) {
  const indicator = getIndicatorCopy(dataStatus, cacheAgeMs);

  return (
    <div className={`inline-flex items-center gap-3 rounded-2xl border px-3 py-2 text-xs ${indicator.toneClass}`}>
      <div className="flex flex-col">
        <span className="font-semibold leading-4">{indicator.title}</span>
        <span className="leading-4 opacity-90">{indicator.label}</span>
      </div>
      {isFetching ? <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold">Syncing</span> : null}
    </div>
  );
}
