import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "../../components/PageHeader";
import { InsightsPanel } from "../../components/cards/InsightsPanel";
import { MarketCapOverview } from "../../components/cards/MarketCapOverview";
import { SectorNewsPanel } from "../../components/cards/SectorNewsPanel";
import { TopMoversPanel } from "../../components/cards/TopMoversPanel";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import { SectorIntradayChart } from "../../components/charts/SectorIntradayChart";
import { SectorIndexOverviewPanel } from "../../components/sector/SectorIndexOverviewPanel";
import { SectorSummaryCards } from "../../components/sector/SectorSummaryCards";
import { StockTable } from "../../components/tables/StockTable";
import { buildSectorModulePath } from "../../lib/sectorConfig";
import { useSectorPageContext } from "./sectorPageContext";

function getModuleCopy(moduleId: string, modules: Array<{ id: string; title: string; description: string; label: string }>) {
  return modules.find(module => module.id === moduleId);
}

export function SectorOverviewModulePage() {
  const { config, data, analytics, signals, sectorHistory } = useSectorPageContext();
  const moduleCards = config.modules.filter(module => module.id !== "overview");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={config.dashboardLabel}
        title={`${config.sectorName} Overview`}
        description="Move between dedicated analytics modules from the left terminal. Each page isolates one major workflow so the dashboard stays focused and fast to scan."
      />

      <SectorIndexOverviewPanel data={data} />

      <SectorIntradayChart
        sectorId={config.id}
        title={`${data.sectorIndex.name} Intraday`}
        week52High={data.sectorIndex.yearHigh}
        week52Low={data.sectorIndex.yearLow}
        intradayHigh={data.sectorIndex.dayHigh}
        intradayLow={data.sectorIndex.dayLow}
      />

      <SectorSummaryCards data={data} analytics={analytics} signals={signals} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moduleCards.map(module => {
          const ModuleIcon = module.icon;
          return (
            <Link
              key={`${config.id}-${module.id}`}
              to={buildSectorModulePath(config.basePath, module.segment)}
              className="glass-card group rounded-2xl border border-[#E6EAF2] p-4 transition hover:-translate-y-0.5 hover:border-blue-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-700">
                  <ModuleIcon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-600" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">{module.label}</h3>
              <p className="mt-2 text-sm text-slate-600">{module.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,1fr)]">
        <SectorNewsPanel title={`${config.newsTitle} Highlights`} items={config.newsItems.slice(0, 3)} />
        <MarketCapOverview
          companies={data.companies}
          marketCapBySymbol={config.marketCapBySymbol}
          sectorName={config.sectorName}
        />
      </section>
    </div>
  );
}

export function SectorIntradayModulePage() {
  const { config, data, sectorHistory } = useSectorPageContext();
  const copy = getModuleCopy("intraday", config.modules);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={config.dashboardLabel}
        title={copy?.title ?? config.chartTitle}
        description={copy?.description ?? "Track live benchmark motion for the sector."}
      />
      <SectorIntradayChart
        sectorId={config.id}
        title={config.chartTitle}
        week52High={data.sectorIndex.yearHigh}
        week52Low={data.sectorIndex.yearLow}
        intradayHigh={data.sectorIndex.dayHigh}
        intradayLow={data.sectorIndex.dayLow}
      />
    </div>
  );
}

export function SectorPerformanceModulePage() {
  const { config, data } = useSectorPageContext();
  const copy = getModuleCopy("performance", config.modules);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={config.dashboardLabel}
        title={copy?.title ?? `${config.sectorName} Performance`}
        description={copy?.description ?? "Inspect sector breadth and market-cap concentration."}
      />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <PerformanceChart
          companies={data.companies}
          title={`${config.sectorName} Performance`}
          description={config.heatmapDescription}
        />
        <MarketCapOverview
          companies={data.companies}
          marketCapBySymbol={config.marketCapBySymbol}
          sectorName={config.sectorName}
        />
      </section>
    </div>
  );
}

export function SectorInsightsModulePage() {
  const { config, data, analytics } = useSectorPageContext();
  const copy = getModuleCopy("insights", config.modules);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={config.dashboardLabel}
        title={copy?.title ?? `${config.sectorName} Insights`}
        description={copy?.description ?? "Review momentum, breadth, and turnover diagnostics."}
      />
      <InsightsPanel
        sectorSpot={data.sectorIndex.lastPrice}
        averageChange={analytics.averageChange}
        advances={analytics.advances}
        declines={analytics.declines}
        totalVolume={analytics.totalVolume}
        volumeLeaderSymbol={analytics.volumeLeader?.symbol}
        sectorName={config.sectorName}
        title={`${config.sectorName} Insights`}
        subtitle="Breadth, momentum, and turnover"
      />
    </div>
  );
}

export function SectorMoversModulePage() {
  const { config, data } = useSectorPageContext();
  const copy = getModuleCopy("gainers-losers", config.modules);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={config.dashboardLabel}
        title={copy?.title ?? `${config.sectorName} Gainers / Losers`}
        description={copy?.description ?? "Focus on the strongest and weakest movers."}
      />
      <TopMoversPanel gainers={data.gainers} losers={data.losers} />
    </div>
  );
}

export function SectorNewsModulePage() {
  const { config } = useSectorPageContext();
  const copy = getModuleCopy("news", config.modules);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={config.dashboardLabel}
        title={copy?.title ?? config.newsTitle}
        description={copy?.description ?? "Review curated sector headlines."}
      />
      <SectorNewsPanel title={config.newsTitle} items={config.newsItems} />
    </div>
  );
}

export function SectorStocksModulePage() {
  const { config, data, companyHistory, signals, search } = useSectorPageContext();
  const copy = getModuleCopy("stocks", config.modules);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={config.dashboardLabel}
        title={copy?.title ?? config.tableTitle}
        description={copy?.description ?? "Scan the live sector stock table with filtering and sparkline history."}
      />
      <StockTable
        companies={data.companies}
        historyBySymbol={companyHistory}
        signals={signals}
        query={search}
        title={config.tableTitle}
        subtitle={config.tableSubtitle}
      />
    </div>
  );
}
