import React, { useEffect, useMemo, useState } from "react";
import LiveTicker from "./LiveTicker.jsx";

function formatDateTime(date) {
  return date.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export default function Header({
  searchValue = "",
  onSearchChange,
  tickerQuotes = [],
  searchDisabled = false
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const dateTimeLabel = useMemo(() => formatDateTime(now), [now]);

  return (
    <header className="app-header">
      <div className="header-main-row">
        <div className="header-title-wrap">
          <h1 className="header-title">Power Sector Dashboard</h1>
          <p className="header-subtitle">Live market intelligence for power companies</p>
        </div>

        <div className="header-actions">
          <div className="header-search">
            <input
              value={searchValue}
              onChange={event => onSearchChange?.(event.target.value)}
              placeholder="Search ticker or company"
              aria-label="Search ticker or company"
              disabled={searchDisabled}
            />
          </div>
          <div className="header-clock" aria-live="polite">
            {dateTimeLabel}
          </div>
        </div>
      </div>

      <div className="header-ticker-row">
        <div className="header-ticker-label">
          <span className="ticker-live-dot" />
          <span>Live Ticker</span>
        </div>
        <LiveTicker quotes={tickerQuotes} />
      </div>
    </header>
  );
}
