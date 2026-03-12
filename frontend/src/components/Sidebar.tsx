import { motion } from "framer-motion";
import { Building2, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { NavLink } from "react-router-dom";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

interface SectorNavItem {
  label: string;
  to: string;
  icon: typeof Zap;
}

const SECTOR_NAV_ITEMS: SectorNavItem[] = [
  { label: "Power Sector Dashboard", to: "/power-sector", icon: Zap },
  { label: "Real Estate Dashboard", to: "/real-estate", icon: Building2 }
];

export function Sidebar({ collapsed = false, onToggleCollapse, onClose }: SidebarProps) {
  return (
    <aside className="h-full w-full border-r border-[#E6EAF2] bg-white/95 px-3 py-4 backdrop-blur-lg">
      <div className={`rounded-2xl border border-blue-200 bg-blue-50 p-3 ${collapsed ? "text-center" : ""}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
          {!collapsed ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-blue-700">Stock Analytics</p>
              <h2 className="mt-1 font-display text-base font-semibold text-slate-900">Sector Terminal</h2>
            </div>
          ) : (
            <div className="rounded-lg border border-blue-200 bg-white p-2">
              <Zap className="h-5 w-5 text-blue-700" />
            </div>
          )}

          {!onClose && onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 transition hover:border-blue-300 xl:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
      </div>

      <nav className="mt-4 space-y-2">
        {SECTOR_NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} onClick={onClose}>
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 3 }}
                  className={`group relative flex items-center rounded-xl border px-3 py-2 transition ${
                    isActive
                      ? "border-blue-300 bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(37,99,235,0.2)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/60"
                  } ${collapsed ? "justify-center" : "justify-start gap-2.5"}`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isActive ? "text-blue-700" : "text-slate-500"} transition`} />
                  {!collapsed ? <span className="text-sm font-medium">{item.label}</span> : null}
                </motion.div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {!collapsed ? <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Coverage</p> : null}
        <ul className={`mt-2 space-y-1.5 ${collapsed ? "mt-0" : ""}`}>
          <li className={`rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs ${collapsed ? "text-center" : ""}`}>
            <span className="font-semibold text-slate-800">Power</span>
            {!collapsed ? <p className="mt-0.5 text-slate-500">NTPC, POWERGRID, TATAPOWER</p> : null}
          </li>
          <li className={`rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs ${collapsed ? "text-center" : ""}`}>
            <span className="font-semibold text-slate-800">Real Estate</span>
            {!collapsed ? <p className="mt-0.5 text-slate-500">DLF, GODREJPROP, PRESTIGE</p> : null}
          </li>
        </ul>
      </section>
    </aside>
  );
}
