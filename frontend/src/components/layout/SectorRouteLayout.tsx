import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

import { Navbar } from "./Navbar";
import { DashboardSkeleton } from "../dashboard/DashboardSkeleton";
import { FooterBar } from "../dashboard/FooterBar";
import type { SectorMarketDataResult } from "../../hooks/useSectorMarketData";
import { deriveSectorAnalytics } from "../../lib/sectorAnalytics";
import type { SectorConfig } from "../../lib/sectorConfig";

interface SectorRouteLayoutProps {
  config: SectorConfig;
  onOpenSidebar: () => void;
  marketData: SectorMarketDataResult;
}

export function SectorRouteLayout({ config, onOpenSidebar, marketData }: SectorRouteLayoutProps) {
  const [search, setSearch] = useState("");
  const location = useLocation();
  const { data, error, isLoading, isFetching, refetch, sectorHistory, companyHistory, signals } = marketData;
  const blockingError = !data && error;
  const analytics = data ? deriveSectorAnalytics(data) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Navbar
        companies={data?.companies ?? []}
        marketStatus={data?.marketStatus}
        fetchedAt={data?.fetchedAt}
        isFetching={isFetching}
        dataStatus={data?.dataStatus}
        cacheAgeMs={data?.cacheAgeMs}
        search={search}
        onSearchChange={setSearch}
        onOpenSidebar={onOpenSidebar}
      />

      <div className="space-y-4 px-4 py-4 md:px-6">
        {isLoading ? <DashboardSkeleton /> : null}

        {!isLoading && blockingError ? (
          <section className="glass-card rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <h2 className="font-display text-2xl text-rose-700">{config.sectorName} data unavailable</h2>
            <p className="mt-2 text-sm text-rose-700/90">
              {error instanceof Error ? error.message : "Failed to load market data"}
            </p>
            <button
              type="button"
              className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </section>
        ) : null}

        {!isLoading && data && analytics ? (
          <>
            {data.dataStatus === "snapshot" ? (
              <section className="glass-card rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {data.warning ?? "Showing bundled or saved snapshot while live market feeds are unavailable."}
              </section>
            ) : null}

            {data.stale && data.dataStatus !== "snapshot" ? (
              <section className="glass-card rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {data.warning ?? "Using cached snapshot while the live feed is temporarily restricted."}
              </section>
            ) : null}

            {data.fallbackIndexUsed ? (
              <section className="glass-card rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Requested index {data.requestedIndex ?? "NSE index"} was unavailable. Showing closest live benchmark
                from feed.
              </section>
            ) : null}

            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet
                  context={{
                    config,
                    data,
                    analytics,
                    sectorHistory,
                    companyHistory,
                    signals,
                    search,
                    setSearch
                  }}
                />
              </motion.div>
            </AnimatePresence>
          </>
        ) : null}

        <FooterBar productLabel={config.dashboardLabel} dataSourceLabel={config.dataSourceLabel} />
      </div>
    </div>
  );
}
