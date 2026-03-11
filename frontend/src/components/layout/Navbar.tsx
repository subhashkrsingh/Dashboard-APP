import { useMemo } from "react";
import { motion } from "framer-motion";

import { formatClock } from "../../lib/formatters";
import type { CompanyQuote, MarketStatus } from "../../types/market";
import { Badge } from "../ui/Badge";

interface NavbarProps {
  companies: CompanyQuote[];
  marketStatus?: MarketStatus;
  fetchedAt?: string;
  isFetching: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
}

export function Navbar({
  companies,
  marketStatus,
  fetchedAt,
  isFetching,
  search,
  onSearchChange,
  onOpenSidebar
}: NavbarProps) {
  const tickerItems = useMemo(
    () =>
      [...companies]
        .filter(item => Number.isFinite(item.percentChange))
        .sort((a, b) => Math.abs(b.percentChange ?? 0) - Math.abs(a.percentChange ?? 0))
        .slice(0, 10),
    [companies]
  );

  return (
    <header className="glass-card sticky top-0 z-20 border-b border-slate-700/60 px-4 py-3 md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg border border-slate-600/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 xl:hidden"
          aria-label="Open sidebar navigation"
        >
          Menu
        </button>

        <div className="min-w-[220px] flex-1">
          <input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            type="search"
            placeholder="Search stocks, symbols, sectors..."
            className="w-full rounded-xl border border-slate-600/70 bg-[#0B1220]/75 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none"
          />
        </div>

        <Badge tone={marketStatus?.isOpen ? "positive" : "negative"} pulse>
          <span className={`h-2 w-2 rounded-full ${marketStatus?.isOpen ? "bg-emerald-300" : "bg-rose-300"}`} />
          Market {marketStatus?.label ?? "CLOSED"}
        </Badge>

        <Badge tone={isFetching ? "accent" : "neutral"}>{isFetching ? "Refreshing" : "Live feed"}</Badge>

        <Badge tone="neutral">IST {formatClock(fetchedAt)}</Badge>

        <button
          type="button"
          className="rounded-xl border border-slate-600/70 bg-slate-900/65 px-3 py-2 text-xs text-slate-200 hover:border-cyan-300/60"
        >
          Alerts (3)
        </button>

        <button
          type="button"
          className="rounded-xl border border-slate-600/70 bg-slate-900/65 px-3 py-2 text-xs font-semibold text-slate-100"
        >
          SK
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-700/70 bg-[#0B1220]/70 py-2">
        {tickerItems.length === 0 ? (
          <p className="px-3 text-xs text-slate-400">Waiting for ticker data...</p>
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
                  <span className="font-semibold text-slate-100">{item.symbol}</span>
                  <span className={positive ? "text-emerald-300" : "text-rose-300"}>
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
