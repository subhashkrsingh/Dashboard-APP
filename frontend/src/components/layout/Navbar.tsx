import { useMemo } from "react";
import { motion } from "framer-motion";
import { Menu, Search, UserCircle2 } from "lucide-react";

import { AppLogo } from "../branding/AppLogo";
import type { CompanyQuote, MarketStatus, SectorDataStatus, SectorSnapshot } from "../../types/market";
import { useMarketAlerts } from "../../hooks/useMarketAlerts";
import LiveISTClock from "../LiveISTClock";
import { AlertDropdown } from "../market/AlertDropdown";
import { FeedStatusIndicator } from "../market/FeedStatusIndicator";
import { Badge } from "../ui/Badge";

interface NavbarProps {
  companies: CompanyQuote[];
  marketStatus?: MarketStatus;
  fetchedAt?: string;
  isFetching: boolean;
  dataStatus?: SectorDataStatus;
  cacheAgeMs?: number;
  apiCacheStatus?: string;
  marketSnapshot?: SectorSnapshot;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
}

export function Navbar({
  companies,
  marketStatus,
  isFetching,
  dataStatus,
  cacheAgeMs,
  apiCacheStatus,
  marketSnapshot,
  search,
  onSearchChange,
  onOpenSidebar
}: NavbarProps) {
  const { alertCount, alerts } = useMarketAlerts(marketSnapshot);
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

        <AppLogo compact className="xl:hidden" />

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

        <Badge tone="neutral">{tickerItems.length} Active Symbols</Badge>
        <Badge tone={marketStatus?.isOpen ? "positive" : "negative"} pulse>
          <span className={`h-2 w-2 rounded-full ${marketStatus?.isOpen ? "bg-emerald-500" : "bg-rose-500"}`} />
          Market {marketStatus?.label ?? "CLOSED"}
        </Badge>

        <Badge tone={isFetching ? "accent" : "neutral"}>{isFetching ? "Refreshing" : "Feed Ready"}</Badge>

        <FeedStatusIndicator dataStatus={dataStatus} cacheAgeMs={cacheAgeMs} isFetching={isFetching} />

        {showApiBadge ? <Badge tone="neutral">API {apiCacheStatus}</Badge> : null}

        <LiveISTClock />

        <AlertDropdown alerts={alerts} alertCount={alertCount} />

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <UserCircle2 className="h-4 w-4" />
          SK
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2">
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
                <div
                  key={`${item.symbol}-${index}`}
                  className="flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs"
                >
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
