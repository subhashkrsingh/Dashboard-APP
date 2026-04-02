import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";

import { formatClock } from "../../lib/formatters";
import type { MarketAlert } from "../../hooks/useMarketAlerts";

interface AlertDropdownProps {
  alerts: MarketAlert[];
  alertCount: number;
}

function getCountTone(alertCount: number) {
  if (alertCount >= 3) {
    return "border-rose-300 bg-rose-50 text-rose-700";
  }

  return "border-amber-300 bg-amber-50 text-amber-700";
}

function getAlertIcon(severity: MarketAlert["severity"]) {
  if (severity === "danger") {
    return "📉";
  }

  if (severity === "warning") {
    return "⚠";
  }

  return "🔔";
}

function AlertItem(alert: MarketAlert) {
  return (
    <div key={alert.id} className="border-b border-slate-200 px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="pt-0.5 text-sm">{getAlertIcon(alert.severity)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-5 text-slate-800">{alert.message}</p>
          <p className="mt-1 text-[11px] text-slate-500">{formatClock(new Date(alert.timestamp).toISOString())}</p>
        </div>
      </div>
    </div>
  );
}

export function AlertDropdown({ alerts, alertCount }: AlertDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orderedAlerts = useMemo(() => [...alerts], [alerts]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:border-blue-300"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-3.5 w-3.5" />
        {`Alerts (${alertCount})`}
        {alertCount > 0 ? (
          <span
            className={`inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${getCountTone(alertCount)}`}
          >
            {alertCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">🔔 Alerts</p>
          </div>

          {orderedAlerts.length === 0 ? (
            <div className="px-4 py-5 text-sm text-slate-500">No active alerts right now.</div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {orderedAlerts.map(alert => (
                <AlertItem key={alert.id} {...alert} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
