import { motion } from "framer-motion";

import type { CompanyQuote } from "../../types/market";

export type SidebarPage = "dashboard" | "sector-performance" | "stocks" | "analytics" | "settings";

interface SidebarProps {
  companies: CompanyQuote[];
  activePage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { page: "dashboard" as SidebarPage, href: "#/dashboard", title: "Dashboard", hint: "Market terminal" },
  {
    page: "sector-performance" as SidebarPage,
    href: "#/sector-performance",
    title: "Sector Performance",
    hint: "Heatmap + flow"
  },
  { page: "stocks" as SidebarPage, href: "#/stocks", title: "Stocks Table", hint: "Symbol universe" },
  { page: "analytics" as SidebarPage, href: "#/analytics", title: "Analytics", hint: "Comparative metrics" },
  { page: "settings" as SidebarPage, href: "#/settings", title: "Settings", hint: "Alerts and profile" }
];

export function Sidebar({ companies, activePage, onNavigate, onClose }: SidebarProps) {
  const trackedSymbols = companies.slice(0, 10);

  return (
    <aside className="h-full w-full border-r border-[#1F2A44] bg-[#0D1629]/95 px-4 py-4 backdrop-blur-lg">
      <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.23em] text-cyan-200">Power Desk</p>
            <h2 className="mt-2 font-display text-lg font-semibold text-slate-100">Trading Terminal</h2>
            <p className="text-xs text-slate-400">Bloomberg style layout</p>
          </div>
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
        {NAV_ITEMS.map(item => (
          <motion.a
            href={item.href}
            key={item.title}
            whileHover={{ x: 4 }}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${
              activePage === item.page
                ? "border-cyan-300/40 bg-cyan-500/12 text-cyan-100"
                : "border-slate-700/70 bg-slate-900/55 text-slate-300"
            }`}
            onClick={() => {
              onNavigate(item.page);
              onClose?.();
            }}
          >
            <span className="text-sm font-medium">{item.title}</span>
            <span className="text-xs text-slate-400">{item.hint}</span>
          </motion.a>
        ))}
      </nav>

      <section className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-900/55 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tracked Symbols</p>
        <ul className="mt-2 space-y-1.5">
          {trackedSymbols.map(item => (
            <li
              key={`nav-${item.symbol}`}
              className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-950/70 px-2 py-1.5 text-xs"
            >
              <span className="font-semibold text-slate-200">{item.symbol}</span>
              <span className="truncate pl-2 text-slate-500">{item.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
