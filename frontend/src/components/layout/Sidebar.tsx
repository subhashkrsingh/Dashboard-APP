import { motion } from "framer-motion";
import {
  Bell,
  Factory,
  LayoutDashboard,
  LineChart,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Star
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppLogo } from "../branding/AppLogo";
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
  { page: "companies", href: "#/companies", title: "Energy Companies", icon: Factory },
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
