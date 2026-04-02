import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Trash2, X } from "lucide-react";

import { formatClock } from "../../lib/formatters";
import type { MarketAlert } from "../../stores/alertStore";
import { clearAlerts, markAsRead, removeAlert } from "../../stores/alertStore";

interface AlertDropdownProps {
  alerts: MarketAlert[];
  unreadCount: number;
}

function getCountTone(unreadCount: number) {
  if (unreadCount >= 3) {
    return "border-rose-300 bg-rose-50 text-rose-700";
  }

  return "border-amber-300 bg-amber-50 text-amber-700";
}

function getSeverityIcon(severity: MarketAlert["severity"]) {
  if (severity === "danger") {
    return <span className="text-rose-600">📉</span>;
  }

  if (severity === "warning") {
    return <span className="text-amber-600">⚠</span>;
  }

  return <span className="text-blue-600">🔔</span>;
}

function getSeverityBadge(severity: MarketAlert["severity"]) {
  if (severity === "danger") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export function AlertDropdown({ alerts, unreadCount }: AlertDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orderedAlerts = useMemo(() => [...alerts].sort((a, b) => b.timestamp - a.timestamp), [alerts]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
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
        Alerts
        {unreadCount > 0 ? (
          <span className={`inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${getCountTone(unreadCount)}`}>
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Alerts</p>
                <p className="text-[11px] text-slate-500">{unreadCount} unread</p>
              </div>
            </div>
            {orderedAlerts.length > 0 ? (
              <button
                type="button"
                onClick={() => clearAlerts()}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            ) : null}
          </div>

          {orderedAlerts.length === 0 ? (
            <div className="px-4 py-5 text-sm text-slate-500">No active alerts right now.</div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto px-3 py-3">
              {orderedAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`mb-2 rounded-2xl border px-3 py-3 last:mb-0 ${getSeverityBadge(alert.severity)} ${alert.read ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5 text-sm">{getSeverityIcon(alert.severity)}</div>
                    <button
                      type="button"
                      onClick={() => markAsRead(alert.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-sm font-medium leading-5">{alert.message}</p>
                      <p className="mt-1 text-[11px] leading-4">
                        {alert.read ? "Read" : "Unread"} at {formatClock(new Date(alert.timestamp).toISOString())}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAlert(alert.id)}
                      className="rounded-full border border-white/70 bg-white/60 p-1 text-slate-500 hover:text-slate-900"
                      aria-label={`Remove alert ${alert.message}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
