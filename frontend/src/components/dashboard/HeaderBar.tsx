import { motion } from "framer-motion";

import { formatClock } from "../../lib/formatters";
import type { CompanyQuote, MarketStatus } from "../../types/market";

interface HeaderBarProps {
  companies: CompanyQuote[];
  marketStatus?: MarketStatus;
  fetchedAt?: string;
  isFetching: boolean;
  onToggleSidebar: () => void;
}

export function HeaderBar({ companies, marketStatus, fetchedAt, isFetching, onToggleSidebar }: HeaderBarProps) {
  const tickerData = companies.filter(company => Number.isFinite(company.percentChange));

  return (
    <header className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/85 shadow-[0_20px_60px_rgba(2,8,23,0.55)]">
      <div className="flex flex-col gap-4 border-b border-slate-700/70 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-lg leading-none text-slate-200 hover:border-cyan-300/60 hover:text-cyan-200"
            aria-label="Open sidebar menu"
          >
            &#9776;
          </button>

          <div>
          <p className="text-xs uppercase tracking-[0.26em] text-cyan-300/85">NSE Financial Terminal</p>
            <button type="button" onClick={onToggleSidebar} className="text-left">
              <h1 className="mt-2 font-display text-2xl font-semibold text-slate-100 md:text-3xl hover:text-cyan-200">
                Power Sector Market Dashboard
              </h1>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold ${
              marketStatus?.isOpen
                ? "border-emerald-400/55 bg-emerald-500/15 text-emerald-200"
                : "border-rose-400/55 bg-rose-500/15 text-rose-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                marketStatus?.isOpen
                  ? "bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.8)]"
                  : "bg-rose-300 shadow-[0_0_14px_rgba(251,113,133,0.8)]"
              }`}
            />
            Market {marketStatus?.label ?? "--"}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-slate-300">
            Last update: {formatClock(fetchedAt)} IST
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-slate-300">
            Feed: {isFetching ? "Refreshing" : "Live"}
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden bg-slate-950/80 py-3">
        {tickerData.length === 0 ? (
          <div className="px-6 text-sm text-slate-400">Waiting for live ticker data...</div>
        ) : (
          <motion.div
            className="ticker-track flex w-max items-center gap-7 px-6"
            initial={{ x: 0 }}
            animate={{ x: "-50%" }}
            transition={{
              duration: 70,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY
            }}
          >
            {[...tickerData, ...tickerData].map((item, index) => {
              const isPositive = (item.percentChange ?? 0) >= 0;
              return (
                <div key={`${item.symbol}-${index}`} className="flex items-center gap-2 whitespace-nowrap text-sm">
                  <span className="font-semibold text-slate-100">{item.symbol}</span>
                  <span className={isPositive ? "text-emerald-300" : "text-rose-300"}>
                    {isPositive ? "+" : "-"} {Math.abs(item.percentChange ?? 0).toFixed(2)}%
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
