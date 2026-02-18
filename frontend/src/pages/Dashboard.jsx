import React, { useEffect, useMemo, useState } from "react";
import LiveCard from "../components/LiveCard.jsx";
import IntradayChart from "../components/IntradayChart.jsx";
import CompareChart from "../components/CompareChart.jsx";
import FundamentalsPanel from "../components/FundamentalsPanel.jsx";

const ACTIVE_SYMBOL_KEY = "power-dashboard-active";

function getStoredSymbol() {
  try {
    return localStorage.getItem(ACTIVE_SYMBOL_KEY);
  } catch {
    return null;
  }
}

function matchesSearch(company, query) {
  const text = String(query || "").trim().toLowerCase();
  if (!text) return true;
  return (
    String(company.name || "").toLowerCase().includes(text) ||
    String(company.symbol || "").toLowerCase().includes(text)
  );
}

export default function Dashboard({
  searchQuery,
  onOpenCompany,
  companies = [],
  rawSeries = {}
}) {
  const [activeSymbol, setActiveSymbol] = useState(() => getStoredSymbol());

  useEffect(() => {
    const symbols = companies.length > 0
      ? companies.map(company => company.symbol)
      : Object.keys(rawSeries);

    if (symbols.length === 0) return;

    if (!activeSymbol || !symbols.includes(activeSymbol)) {
      const firstWithData = symbols.find(sym => (rawSeries[sym] || []).length > 0);
      setActiveSymbol(firstWithData ?? symbols[0]);
    }
  }, [rawSeries, activeSymbol, companies]);

  useEffect(() => {
    if (!activeSymbol) return;
    try {
      localStorage.setItem(ACTIVE_SYMBOL_KEY, activeSymbol);
    } catch {
      // Ignore storage errors.
    }
  }, [activeSymbol]);

  const sourceCompanies = companies.length > 0
    ? companies
    : Object.keys(rawSeries).map(symbol => ({ symbol, name: symbol, sector: "Power" }));

  const companyMap = useMemo(() => {
    const map = {};
    sourceCompanies.forEach(c => {
      map[c.symbol] = c;
    });
    return map;
  }, [sourceCompanies]);

  const visibleCompanies = sourceCompanies.filter(company => matchesSearch(company, searchQuery));

  const cards = visibleCompanies.map(company => {
    const symbol = company.symbol;
    const series = rawSeries[symbol] || [];
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const changePct = prev && last ? ((last.price - prev.price) / prev.price) * 100 : null;
    const sparkKey = last ? last.time : "empty";

    return {
      symbol,
      name: company.name ?? symbol,
      price: last?.price ?? null,
      changePct,
      sparkData: series.slice(-20),
      sparkKey,
      status: company.status ?? "pending",
      statusMessage: company.statusMessage ?? "Waiting for data",
      hasData: series.length > 0
    };
  });

  const selectableSymbols = sourceCompanies.map(company => company.symbol);
  const safeActiveSymbol = activeSymbol && selectableSymbols.includes(activeSymbol)
    ? activeSymbol
    : (selectableSymbols[0] || null);
  const activeSeries = safeActiveSymbol ? (rawSeries[safeActiveSymbol] || []) : [];
  const activeName = companyMap[safeActiveSymbol]?.name ?? safeActiveSymbol ?? "-";

  return (
    <div className="dashboard">
      <section className="section">
        <div className="section-header">
          <h2>Live Market</h2>
          <p>Real-time quotes across the power sector. Click a ticker to open full company view.</p>
        </div>
        <div className="live-grid">
          {cards.length === 0 && (
            <div className="empty">
              {String(searchQuery || "").trim()
                ? "No tickers matched your search."
                : "Waiting for live ticks..."}
            </div>
          )}
          {cards.map(card => (
            <LiveCard
              key={card.symbol}
              {...card}
              isActive={card.symbol === safeActiveSymbol}
              onSelect={() => setActiveSymbol(card.symbol)}
              onOpenDetails={() => onOpenCompany?.(card.symbol)}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <div className="section-header">
            <h2>Intraday View</h2>
            <p>High-resolution trend tracking</p>
          </div>
          {selectableSymbols.length > 0 ? (
            <label className="select-wrap">
              <span>Ticker</span>
              <select
                value={safeActiveSymbol ?? ""}
                onChange={event => setActiveSymbol(event.target.value)}
              >
                {sourceCompanies.map(company => (
                  <option key={company.symbol} value={company.symbol}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <IntradayChart symbol={safeActiveSymbol ?? "--"} series={activeSeries} />
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Comparison</h2>
          <p>Relative performance across peers</p>
        </div>
        <CompareChart data={rawSeries} />
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Fundamentals</h2>
          <p>Quick fundamentals snapshot</p>
        </div>
        <FundamentalsPanel companyName={activeName} />
      </section>
    </div>
  );
}
