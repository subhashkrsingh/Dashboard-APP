
import { formatClock } from "../../lib/formatters";
import type { CompanyQuote, MarketStatus } from "../../types/market";

interface SidebarPanelProps {
  companies: CompanyQuote[];
  marketStatus?: MarketStatus;
  fetchedAt?: string;
  onClose?: () => void;
}

export function SidebarPanel({ companies, marketStatus, fetchedAt, onClose }: SidebarPanelProps) {
  return (
    <aside className="h-full overflow-y-auto border-r border-slate-800/85 bg-slate-950/95 p-4 lg:p-5">
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/85">Power Terminal</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-slate-100">Market Desk</h2>
            <p className="mt-1 text-xs text-slate-400">NSE Power Sector Monitor</p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-sm text-slate-200 hover:border-cyan-300/60 hover:text-cyan-200"
              aria-label="Close sidebar"
            >
              x
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
        <p
          className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            marketStatus?.isOpen
              ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
              : "border-rose-400/60 bg-rose-500/15 text-rose-200"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${marketStatus?.isOpen ? "bg-emerald-300" : "bg-rose-300"}`} />
          {marketStatus?.label ?? "--"}
        </p>
        <p className="mt-2 text-xs text-slate-400">Last tick: {formatClock(fetchedAt)} IST</p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tracked Companies</p>
        <ul className="mt-3 max-h-[46vh] space-y-1.5 overflow-y-auto pr-1 text-sm text-slate-200">
          {companies.map(company => (
            <li key={`side-${company.symbol}`} className="flex items-center justify-between rounded-md bg-slate-950/70 px-2 py-1.5">
              <span>{company.symbol}</span>
              <span className="text-xs text-slate-400">{company.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
