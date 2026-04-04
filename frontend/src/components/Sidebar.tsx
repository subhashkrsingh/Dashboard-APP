import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { AppLogo } from "./branding/AppLogo";
import { sectorSidebarConfig } from "../lib/sectorConfig";
import { SectorSidebarGroup } from "./SectorSidebarGroup";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

function getActiveGroup(pathname: string) {
  return sectorSidebarConfig.find(sector => pathname.startsWith(sector.basePath))?.id ?? "energy-sector";
}

const SECTION_HIGHLIGHT_CLASSES = ["ring-2", "ring-cyan-400", "ring-offset-2", "ring-offset-[#F5F7FB]"];

export function Sidebar({ collapsed = false, onToggleCollapse, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const activeGroup = getActiveGroup(location.pathname);
    return Object.fromEntries(sectorSidebarConfig.map(sector => [sector.id, sector.id === activeGroup]));
  });
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const activeGroupId = getActiveGroup(location.pathname);
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

  function pulseSectionHighlight(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (!section) return false;

    section.classList.add(...SECTION_HIGHLIGHT_CLASSES);
    window.setTimeout(() => {
      section.classList.remove(...SECTION_HIGHLIGHT_CLASSES);
    }, 1600);

    return true;
  }

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
      </div>
    </aside>
  );
}
