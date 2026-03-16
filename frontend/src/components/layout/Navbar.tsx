import { useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, Menu, Search, UserCircle2 } from "lucide-react";

import { formatClock } from "../../lib/formatters";
import type { CompanyQuote, MarketStatus, SectorDataStatus } from "../../types/market";
import { Badge } from "../ui/Badge";

interface NavbarProps {
  companies: CompanyQuote[];
  marketStatus?: MarketStatus;
  fetchedAt?: string;
  isFetching: boolean;
  dataStatus?: SectorDataStatus;
  cacheAgeMs?: number;
  apiCacheStatus?: string;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
}

function getDataStatusBadge(dataStatus: SectorDataStatus | undefined, cacheAgeMs: number | undefined) {
  if (dataStatus === "snapshot") {
    return {
      tone: "negative" as const,
      label: "Snapshot Mode"
    };
  }

  if (dataStatus === "stale") {
    const ageSeconds = Number.isFinite(cacheAgeMs) ? Math.max(1, Math.round(Number(cacheAgeMs) / 1000)) : null;
    return {
      tone: "warning" as const,
      label: ageSeconds ? `Stale Data ${ageSeconds}s` : "Stale Data"
    };
  }

  return {
    tone: "positive" as const,
    label: "Live Data"
  };
}

export function Navbar({
  companies,
  marketStatus,
  fetchedAt,
  isFetching,
  dataStatus,
  cacheAgeMs,
  apiCacheStatus,
  search,
  onSearchChange,
  onOpenSidebar
}: NavbarProps) {
  const feedBadge = getDataStatusBadge(dataStatus, cacheAgeMs);
  const showApiBadge = Boolean(apiCacheStatus) && (import.meta.env.DEV || dataStatus !== "live");
  const tickerItems = useMemo(
    () =>
      [...companies]
        .filter(item => Number.isFinite(item.percentChange))
        .sort((a, b) => Math.abs(b.percentChange ?? 0) - Math.abs(a.percentChange ?? 0))
        .slice(0, 10),
    [companies]
  );

  return (
    <header className="glass-card sticky top-0 z-20 border-b border-[#E6EAF2] px-4 py-3 md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 xl:hidden"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-4 w-4" />
          Menu
        </button>

        <div className="relative min-w-[220px] flex-1">
          <label htmlFor="stock-search" className="sr-only">
            Search stocks
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="stock-search"
            name="stockSearch"
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Search stocks..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <Badge tone={marketStatus?.isOpen ? "positive" : "negative"} pulse>
          <span className={`h-2 w-2 rounded-full ${marketStatus?.isOpen ? "bg-emerald-500" : "bg-rose-500"}`} />
          Market {marketStatus?.label ?? "CLOSED"}
        </Badge>

        <Badge tone={isFetching ? "accent" : "neutral"}>{isFetching ? "Refreshing" : "Feed Ready"}</Badge>

        <Badge tone={feedBadge.tone}>{feedBadge.label}</Badge>

        {showApiBadge ? <Badge tone="neutral">API {apiCacheStatus}</Badge> : null}

        <Badge tone="neutral">IST {formatClock(fetchedAt)}</Badge>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:border-blue-300"
        >
          <Bell className="h-3.5 w-3.5" />
          Alerts (3)
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <UserCircle2 className="h-4 w-4" />
          SK
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white py-2">
        {tickerItems.length === 0 ? (
          <p className="px-3 text-xs text-slate-500">Waiting for ticker data...</p>
        ) : (
          <motion.div
            className="flex w-max items-center gap-6 px-4"
            initial={{ x: 0 }}
            animate={{ x: "-50%" }}
            transition={{
              duration: 48,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY
            }}
          >
            {[...tickerItems, ...tickerItems].map((item, index) => {
              const positive = (item.percentChange ?? 0) >= 0;
              return (
                <div key={`${item.symbol}-${index}`} className="flex items-center gap-2 whitespace-nowrap text-xs">
                  <span className="font-semibold text-slate-800">{item.symbol}</span>
                  <span className={positive ? "text-emerald-600" : "text-rose-600"}>
                    {positive ? "+" : ""}
                    {(item.percentChange ?? 0).toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </header>
  );
}
