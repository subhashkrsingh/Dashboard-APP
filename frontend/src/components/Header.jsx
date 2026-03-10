import { useEffect, useState } from "react";

function formatIstClock(date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata"
  }).format(date);
}

export default function Header({ marketStatus, isFetching, fetchedAt }) {
  const [clock, setClock] = useState(() => formatIstClock(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      setClock(formatIstClock(new Date()));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return (
    <header className="animate-popIn rounded-2xl border border-dashboard-border/80 bg-dashboard-panel/90 p-5 shadow-glow">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.24em] text-cyan-300/80">NSE Live Dashboard</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-white md:text-3xl">
            Power Sector Market Monitor
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Real-time snapshot of NIFTY POWER and major constituents using NSE public endpoints.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 md:items-end">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                marketStatus?.isOpen ? "bg-dashboard-positive shadow-[0_0_12px_rgba(34,197,94,0.75)]" : "bg-dashboard-negative shadow-[0_0_12px_rgba(239,68,68,0.65)]"
              }`}
            />
            <span className="font-semibold text-white">Market {marketStatus?.label || "--"}</span>
          </div>
          <div className="text-xs text-slate-400">IST {clock}</div>
          <div className="text-xs text-slate-400">{isFetching ? "Refreshing..." : "Feed steady"}</div>
          <div className="text-xs text-slate-500">Last fetch: {fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : "--"}</div>
        </div>
      </div>
    </header>
  );
}
