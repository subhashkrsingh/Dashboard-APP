import { motion } from "framer-motion";
import {
  Bell,
  Factory,
  LayoutDashboard,
  LineChart,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Star,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { CompanyQuote } from "../../types/market";

export type SidebarPage = "dashboard" | "companies" | "analytics" | "alerts" | "watchlist" | "settings";

interface SidebarProps {
  companies: CompanyQuote[];
  activePage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

interface NavItem {
  page: SidebarPage;
  href: string;
  title: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { page: "dashboard", href: "#/dashboard", title: "Dashboard", icon: LayoutDashboard },
  { page: "companies", href: "#/companies", title: "Power Companies", icon: Factory },
  { page: "analytics", href: "#/analytics", title: "Sector Analytics", icon: LineChart },
  { page: "alerts", href: "#/alerts", title: "Alerts", icon: Bell },
  { page: "watchlist", href: "#/watchlist", title: "Watchlist", icon: Star },
  { page: "settings", href: "#/settings", title: "Settings", icon: Settings }
];

export function Sidebar({
  companies,
  activePage,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  onClose
}: SidebarProps) {
  const trackedSymbols = companies.slice(0, collapsed ? 4 : 8);

  return (
    <aside className="h-full w-full border-r border-[#1F2A44] bg-[#0D1629]/95 px-3 py-4 backdrop-blur-lg">
      <div className={`rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 ${collapsed ? "text-center" : ""}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
          {!collapsed ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200">NSE Power Sector</p>
              <h2 className="mt-1 font-display text-base font-semibold text-slate-100">Trading Terminal</h2>
            </div>
          ) : (
            <div className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 p-2">
              <Zap className="h-5 w-5 text-cyan-100" />
            </div>
          )}

          {!onClose && onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden rounded-lg border border-slate-600/70 bg-slate-900/80 p-1.5 text-slate-100 transition hover:border-cyan-300/60 xl:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600/70 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 xl:hidden"
            >
              Close
            </button>
          ) : null}
        </div>
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
                  ? "border-cyan-300/45 bg-cyan-500/15 text-cyan-100 shadow-[0_0_0_1px_rgba(6,182,212,0.28)]"
                  : "border-slate-700/70 bg-slate-900/55 text-slate-300 hover:border-cyan-400/35 hover:bg-cyan-500/8"
              } ${collapsed ? "justify-center" : "justify-start gap-2.5"}`}
              onClick={() => {
                onNavigate(item.page);
                onClose?.();
              }}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? "text-cyan-100" : "text-slate-300"} transition`} />
              {!collapsed ? <span className="text-sm font-medium">{item.title}</span> : null}
            </motion.a>
          );
        })}
      </nav>

      <section className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-900/55 p-2.5">
        {!collapsed ? <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Watchlist Pulse</p> : null}
        <ul className={`mt-2 space-y-1.5 ${collapsed ? "mt-0" : ""}`}>
          {trackedSymbols.map(item => (
            <li
              key={`nav-${item.symbol}`}
              className={`rounded-lg border border-slate-700/60 bg-slate-950/70 px-2 py-1.5 text-xs ${
                collapsed ? "text-center" : "flex items-center justify-between"
              }`}
              title={!collapsed ? undefined : item.symbol}
            >
              <span className="font-semibold text-slate-200">{item.symbol}</span>
              {!collapsed ? <span className="truncate pl-2 text-slate-500">{item.name}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
