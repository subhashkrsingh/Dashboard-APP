import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  Factory,
  LayoutDashboard,
  LineChart,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Star
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { AppLogo } from "../branding/AppLogo";
import { sectorSidebarConfig } from "../../lib/sectorConfig";
import { SectorSidebarGroup } from "../SectorSidebarGroup";
import type { CompanyQuote } from "../../types/market";

export type SidebarPage = "dashboard" | "companies" | "analytics" | "alerts" | "watchlist" | "settings";

interface DashboardSidebarProps {
  companies: CompanyQuote[];
  activePage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

interface GlobalSidebarProps {
  companies?: never;
  activePage?: never;
  onNavigate?: never;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

type SidebarProps = DashboardSidebarProps | GlobalSidebarProps;

interface NavItem {
  page: SidebarPage;
  href: string;
  title: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { page: "dashboard", href: "#/dashboard", title: "Dashboard", icon: LayoutDashboard },
  { page: "companies", href: "#/companies", title: "Energy Companies", icon: Factory },
  { page: "analytics", href: "#/analytics", title: "Sector Analytics", icon: LineChart },
  { page: "alerts", href: "#/alerts", title: "Alerts", icon: Bell },
  { page: "watchlist", href: "#/watchlist", title: "Watchlist", icon: Star },
  { page: "settings", href: "#/settings", title: "Settings", icon: Settings }
];

const SECTION_HIGHLIGHT_CLASSES = ["ring-2", "ring-cyan-400", "ring-offset-2", "ring-offset-[#F5F7FB]"];

function getActiveGroup(pathname: string) {
  return sectorSidebarConfig.find(sector => pathname.startsWith(sector.basePath))?.id ?? "energy-sector";
}

function pulseSectionHighlight(sectionId: string) {
  const section = document.getElementById(sectionId);
  if (!section) return false;

  section.classList.add(...SECTION_HIGHLIGHT_CLASSES);
  window.setTimeout(() => {
    section.classList.remove(...SECTION_HIGHLIGHT_CLASSES);
  }, 1600);

  return true;
}

function GlobalSidebar({ collapsed = false, onToggleCollapse, onClose }: GlobalSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const activeGroup = getActiveGroup(location.pathname);
    return Object.fromEntries(sectorSidebarConfig.map(sector => [sector.id, sector.id === activeGroup]));
  });
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const activeGroupId = getActiveGroup(location.pathname);
  const residexActive = location.pathname.startsWith("/residex");
  const activeSector = useMemo(
    () => sectorSidebarConfig.find(sector => sector.id === activeGroupId) ?? sectorSidebarConfig[0],
    [activeGroupId]
  );

  useEffect(() => {
    const activeGroup = getActiveGroup(location.pathname);
    setExpandedGroups(current => ({
      ...current,
      [activeGroup]: true
    }));
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let observer: IntersectionObserver | null = null;
    let timeoutId: number | null = null;
    let attempts = 0;

    const sectionModules = activeSector.modules.filter(module => module.id !== "overview");

    const connectObserver = () => {
      const observedSections = sectionModules
        .map(module => document.getElementById(module.sectionId))
        .filter((section): section is HTMLElement => Boolean(section));

      if (observedSections.length === 0) {
        if (attempts < 20) {
          attempts += 1;
          timeoutId = window.setTimeout(connectObserver, 150);
        } else {
          setActiveSectionId(null);
        }
        return;
      }

      observer = new IntersectionObserver(
        entries => {
          const visibleEntries = entries
            .filter(entry => entry.isIntersecting)
            .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

          if (visibleEntries[0]) {
            setActiveSectionId(visibleEntries[0].target.id);
            return;
          }

          const firstSection = observedSections[0];
          if (window.scrollY < firstSection.offsetTop) {
            setActiveSectionId(firstSection.id);
          }
        },
        {
          rootMargin: "-18% 0px -55% 0px",
          threshold: [0.15, 0.35, 0.6]
        }
      );

      observedSections.forEach(section => observer?.observe(section));
      setActiveSectionId(observedSections[0]?.id ?? null);
    };

    connectObserver();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      observer?.disconnect();
    };
  }, [activeSector, location.pathname]);

  function handleSectorSelect(basePath: string) {
    if (location.pathname.startsWith(basePath)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      onClose?.();
      return;
    }

    navigate(basePath);
    onClose?.();
  }

  function handleSectionSelect(basePath: string, sectionId: string) {
    if (location.pathname.startsWith(basePath)) {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        pulseSectionHighlight(sectionId);
        setActiveSectionId(sectionId);
      }
      onClose?.();
      return;
    }

    navigate({
      pathname: basePath,
      search: `?section=${sectionId}`
    });
    onClose?.();
  }

  return (
    <aside className="h-screen w-full overflow-y-auto border-r border-[#E6EAF2] bg-white/95 px-3 py-4 backdrop-blur-lg">
      <div className={`rounded-2xl border border-blue-200 bg-blue-50 p-3 ${collapsed ? "space-y-2 text-center" : ""}`}>
        {collapsed ? (
          <>
            <AppLogo compact className="mx-auto" />

            {!onClose && onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 transition hover:border-blue-300 xl:inline-flex"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <AppLogo subtitle="Unified Market Terminal" />

            {!onClose && onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 transition hover:border-blue-300 xl:inline-flex"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}

            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 xl:hidden"
              >
                Close
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {sectorSidebarConfig.map(sector => (
          <SectorSidebarGroup
            key={sector.id}
            sector={sector}
            collapsed={collapsed}
            expanded={expandedGroups[sector.id] ?? false}
            isCurrentSector={activeSector.id === sector.id}
            activeSectionId={activeSector.id === sector.id ? activeSectionId : null}
            onExpand={() =>
              setExpandedGroups(current => ({
                ...current,
                [sector.id]: true
              }))
            }
            onSectorSelect={() => handleSectorSelect(sector.basePath)}
            onSectionSelect={sectionId => handleSectionSelect(sector.basePath, sectionId)}
            onToggleExpanded={() =>
              setExpandedGroups(current => ({
                ...current,
                [sector.id]: !current[sector.id]
              }))
            }
            onClose={onClose}
          />
        ))}

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            onClick={() => {
              if (residexActive) {
                window.scrollTo({ top: 0, behavior: "smooth" });
                onClose?.();
                return;
              }

              navigate("/residex");
              onClose?.();
            }}
            className={`group flex w-full items-center rounded-xl px-3 py-2 text-left transition ${
              residexActive
                ? "bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(37,99,235,0.15)]"
                : "text-slate-700 hover:bg-slate-50"
            } ${collapsed ? "justify-center" : "gap-2.5"}`}
            title={collapsed ? "RESIDEX Index" : undefined}
          >
            <Building2 className="h-[18px] w-[18px] shrink-0" />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">RESIDEX Index</p>
                <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-400">Residential Index</p>
              </div>
            ) : null}
          </button>
        </section>
      </div>
    </aside>
  );
}

function DashboardSidebar({
  companies,
  activePage,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  onClose
}: DashboardSidebarProps) {
  const trackedSymbols = companies.slice(0, collapsed ? 4 : 8);

  return (
    <aside className="h-full w-full border-r border-[#E6EAF2] bg-white/95 px-3 py-4 backdrop-blur-lg">
      <div className={`rounded-2xl border border-blue-200 bg-blue-50 p-3 ${collapsed ? "space-y-2 text-center" : ""}`}>
        {collapsed ? (
          <>
            <AppLogo compact className="mx-auto" />

            {!onClose && onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 transition hover:border-blue-300 xl:inline-flex"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <AppLogo subtitle="Live Sector Terminal" />

            {!onClose && onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 transition hover:border-blue-300 xl:inline-flex"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            ) : null}

            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 xl:hidden"
              >
                Close
              </button>
            ) : null}
          </div>
        )}
      </div>

      <nav className="mt-4 space-y-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = activePage === item.page;

          return (
            <motion.a
              href={item.href}
              key={item.title}
              whileHover={{ x: collapsed ? 0 : 3 }}
              className={`group relative flex items-center rounded-xl border px-3 py-2 transition ${
                active
                  ? "border-blue-300 bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(37,99,235,0.2)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/60"
              } ${collapsed ? "justify-center" : "justify-start gap-2.5"}`}
              onClick={() => {
                onNavigate(item.page);
                onClose?.();
              }}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? "text-blue-700" : "text-slate-500"} transition`} />
              {!collapsed ? <span className="text-sm font-medium">{item.title}</span> : null}
            </motion.a>
          );
        })}
      </nav>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
        {!collapsed ? <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Watchlist Pulse</p> : null}
        <ul className={`mt-2 space-y-1.5 ${collapsed ? "mt-0" : ""}`}>
          {trackedSymbols.map(item => (
            <li
              key={`nav-${item.symbol}`}
              className={`rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs ${
                collapsed ? "text-center" : "flex items-center justify-between"
              }`}
              title={!collapsed ? undefined : item.symbol}
            >
              <span className="font-semibold text-slate-800">{item.symbol}</span>
              {!collapsed ? <span className="truncate pl-2 text-slate-500">{item.name}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

export function Sidebar(props: SidebarProps) {
  if ("activePage" in props && "companies" in props && "onNavigate" in props) {
    return <DashboardSidebar {...(props as DashboardSidebarProps)} />;
  }

  return <GlobalSidebar {...(props as GlobalSidebarProps)} />;
}
