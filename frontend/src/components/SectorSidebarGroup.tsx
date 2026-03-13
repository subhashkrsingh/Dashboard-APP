import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import type { SectorConfig } from "../lib/sectorConfig";

interface SectorSidebarGroupProps {
  sector: SectorConfig;
  collapsed: boolean;
  expanded: boolean;
  isCurrentSector: boolean;
  activeSectionId: string | null;
  onExpand: () => void;
  onSectorSelect: () => void;
  onSectionSelect: (sectionId: string) => void;
  onToggleExpanded: () => void;
  onClose?: () => void;
}

export function SectorSidebarGroup({
  sector,
  collapsed,
  expanded,
  isCurrentSector,
  activeSectionId,
  onExpand,
  onSectorSelect,
  onSectionSelect,
  onToggleExpanded,
  onClose
}: SectorSidebarGroupProps) {
  const SectorIcon = sector.icon;
  const sectionModules = sector.modules.filter(module => module.id !== "overview");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
        <button
          type="button"
          onClick={() => {
            onExpand();
            onSectorSelect();
          }}
          className={`group flex min-w-0 flex-1 items-center rounded-xl px-3 py-2 text-left transition ${
            isCurrentSector
              ? "bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(37,99,235,0.15)]"
              : "text-slate-700 hover:bg-slate-50"
          } ${collapsed ? "justify-center" : "gap-2.5"}`}
        >
          <SectorIcon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{sector.label}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-400">Sector Terminal</p>
            </div>
          ) : null}
        </button>

        {!collapsed ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:border-blue-200 hover:text-blue-700"
            aria-label={expanded ? `Collapse ${sector.label} links` : `Expand ${sector.label} links`}
          >
            <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        ) : null}
      </div>

      {!collapsed ? (
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                {sectionModules.map(module => {
                  const ModuleIcon = module.icon;
                  const isActive = isCurrentSector && activeSectionId === module.sectionId;

                  return (
                    <button
                      type="button"
                      key={`${sector.id}-${module.id}`}
                      onClick={() => onSectionSelect(module.sectionId)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(37,99,235,0.12)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <ModuleIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{module.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      ) : null}
    </section>
  );
}
