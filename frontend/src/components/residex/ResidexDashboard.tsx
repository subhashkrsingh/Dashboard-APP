import { Suspense, lazy, useEffect } from "react";
import { BarChart3, Menu, RefreshCw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { FooterBar } from "../dashboard/FooterBar";
import { PageHeader } from "../PageHeader";
import { Badge } from "../ui/Badge";
import { ResidexProvider, useResidexContext, type ResidexTab } from "./ResidexContext";
import { ResidexCards } from "./ResidexCards";
import { ResidexCharts } from "./ResidexCharts";
import { ResidexFilters } from "./ResidexFilters";
import { ResidexTable } from "./ResidexTable";
import {
  getResidexPathFromSection,
  getResidexSectionFromPath,
  type ResidexSectionId
} from "../../lib/residexConfig";

const NSEMap = lazy(() =>
  import("./NSEMap").then(module => ({ default: module.NSEMap }))
);

const AIInsights = lazy(() =>
  import("./AIInsights").then(module => ({ default: module.AIInsights }))
);

const ComparisonControls = lazy(() =>
  import("./ComparisonControls").then(module => ({ default: module.ComparisonControls }))
);

const ComparisonChart = lazy(() =>
  import("./ComparisonChart").then(module => ({ default: module.ComparisonChart }))
);

const TABS: Array<{ id: ResidexTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "cities", label: "Cities" },
  { id: "affordable", label: "Affordable" },
  { id: "premium", label: "Premium" },
  { id: "table", label: "Table" }
];

const SECTION_HIGHLIGHT_CLASSES = ["ring-2", "ring-cyan-400", "ring-offset-2", "ring-offset-[#F5F7FB]"];
const TAB_TO_SECTION: Record<ResidexTab, ResidexSectionId> = {
  overview: "overview",
  cities: "cities",
  affordable: "affordable",
  premium: "premium",
  table: "table"
};
const SECTION_TO_TAB: Partial<Record<ResidexSectionId, ResidexTab>> = {
  overview: "overview",
  cities: "cities",
  national: "overview",
  affordable: "affordable",
  premium: "premium",
  map: "overview",
  table: "table"
};

function pulseSectionHighlight(sectionId: string) {
  const section = document.getElementById(sectionId);
  if (!section) return false;

  section.classList.add(...SECTION_HIGHLIGHT_CLASSES);
  window.setTimeout(() => {
    section.classList.remove(...SECTION_HIGHLIGHT_CLASSES);
  }, 1600);

  return true;
}

function ResidexDashboardView({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    loading,
    error,
    headerStats,
    activeTab,
    selectedCityLabel,
    selectedPeriodLabel,
    refreshKey,
    setActiveTab,
    refresh
  } = useResidexContext();

  function jumpToSection(tab: ResidexTab) {
    setActiveTab(tab);
    const sectionId = TAB_TO_SECTION[tab];
    const targetPath = getResidexPathFromSection(sectionId);

    if (location.pathname === targetPath) {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        pulseSectionHighlight(sectionId);
      } else if (sectionId === "overview") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    navigate(targetPath);
  }

  useEffect(() => {
    if (loading || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(location.search);
    const requestedSection = params.get("section");
    const routeSection = getResidexSectionFromPath(location.pathname);
    const targetSectionId = requestedSection || routeSection;

    if (!targetSectionId) {
      return;
    }

    const nextTab = SECTION_TO_TAB[targetSectionId as ResidexSectionId];
    if (nextTab) {
      setActiveTab(nextTab);
    }

    let attempts = 0;
    let timeoutId: number | null = null;

    const scrollToTarget = () => {
      const section = document.getElementById(targetSectionId);

      if (!section) {
        if (attempts < 20) {
          attempts += 1;
          timeoutId = window.setTimeout(scrollToTarget, 120);
        }
        return;
      }

      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      pulseSectionHighlight(targetSectionId);

      if (requestedSection) {
        navigate(location.pathname, { replace: true });
      }
    };

    scrollToTarget();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [loading, location.pathname, location.search, navigate, setActiveTab]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="glass-card sticky top-0 z-20 border-b border-[#E6EAF2] px-4 py-3 md:px-6 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 xl:hidden"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>

          <div className="min-w-[220px] flex-1">
            <p className="text-xs uppercase tracking-[0.24em] text-blue-600">EnergyXchange Module</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-slate-900">RESIDEX Index</h1>
          </div>

          <Badge tone="accent">{selectedPeriodLabel}</Badge>
          <Badge tone="neutral">{selectedCityLabel}</Badge>
          {headerStats.map(stat => (
            <Badge key={stat.label} tone="neutral">
              {stat.label}: {stat.value}
            </Badge>
          ))}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <div key={refreshKey} className="space-y-4 px-4 py-4 md:px-6">
        <PageHeader
          eyebrow="RESIDENTIAL MARKET INTELLIGENCE"
          title="RESIDEX Real Estate Dashboard"
          description="Track the national residential index, metro-level movement, affordable and premium housing momentum, and exportable quarterly views from one integrated dashboard."
        />

        <ResidexFilters />

        <Suspense
          fallback={
            <section className="glass-card rounded-2xl border border-[#E6EAF2] p-6 dark:border-slate-800 dark:bg-slate-950/80">
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </section>
          }
        >
          <ComparisonControls />
        </Suspense>

        <section className="glass-card rounded-2xl border border-[#E6EAF2] p-3 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => jumpToSection(tab.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-800 hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {loading ? (
          <section className="glass-card rounded-2xl border border-[#E6EAF2] p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-40 rounded bg-slate-200" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-40 rounded-2xl bg-slate-100" />
                ))}
              </div>
              <div className="h-72 rounded-2xl bg-slate-100" />
            </div>
          </section>
        ) : null}

        {!loading && error ? (
          <section className="glass-card rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-rose-600" />
              <h2 className="font-display text-xl font-semibold text-rose-700">RESIDEX feed unavailable</h2>
            </div>
            <p className="mt-2 text-sm text-rose-700/90">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Retry
            </button>
          </section>
        ) : null}

        {!loading && !error ? (
          <>
            <section id="overview" className="space-y-4">
              <ResidexCards />

              <Suspense
                fallback={
                  <section className="glass-card rounded-2xl border border-[#E6EAF2] p-6 dark:border-slate-800 dark:bg-slate-950/80">
                    <div className="animate-pulse space-y-4">
                      <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-900" />
                        ))}
                      </div>
                    </div>
                  </section>
                }
              >
                <AIInsights />
              </Suspense>

              <Suspense
                fallback={
                  <section className="glass-card rounded-2xl border border-[#E6EAF2] p-6 dark:border-slate-800 dark:bg-slate-950/80">
                    <div className="animate-pulse space-y-4">
                      <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-900" />
                    </div>
                  </section>
                }
              >
                <ComparisonChart />
              </Suspense>

              <section id="map">
                <Suspense
                  fallback={
                    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-6 dark:border-slate-800 dark:bg-slate-950/80">
                      <div className="animate-pulse space-y-4">
                        <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-[560px] rounded-[28px] bg-slate-100 dark:bg-slate-900" />
                      </div>
                    </section>
                  }
                >
                  <NSEMap />
                </Suspense>
              </section>

              <ResidexCharts />
            </section>

            <section id="table">
              <ResidexTable />
            </section>
          </>
        ) : null}

        <FooterBar productLabel="EnergyXchange RESIDEX Dashboard" dataSourceLabel="Mock RESIDEX service" />
      </div>
    </div>
  );
}

export function ResidexDashboard({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <ResidexProvider>
      <ResidexDashboardView onOpenSidebar={onOpenSidebar} />
    </ResidexProvider>
  );
}
