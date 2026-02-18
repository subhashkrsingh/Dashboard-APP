import React, { useEffect, useMemo, useState } from "react";
import LiveCard from "../components/LiveCard.jsx";
import LiveTicker from "../components/LiveTicker.jsx";
import IntradayChart from "../components/IntradayChart.jsx";
import CompareChart from "../components/CompareChart.jsx";
import FundamentalsPanel from "../components/FundamentalsPanel.jsx";

const MAX_POINTS = 120;
const ACTIVE_SYMBOL_KEY = "power-dashboard-active";

function useQuoteStream() {
  const [seriesBySymbol, setSeriesBySymbol] = useState({});

  useEffect(() => {
    const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
    const devHost = import.meta.env.VITE_API_HOST || "127.0.0.1:3000";
    const wsHost = import.meta.env.DEV ? devHost : location.host;
    const ws = new WebSocket(`${wsProtocol}://${wsHost}`);

    ws.addEventListener("message", evt => {
      const msg = JSON.parse(evt.data);
      if (msg.type !== "quotes") return;

      setSeriesBySymbol(prev => {
        const next = { ...prev };
        msg.data.forEach(q => {
          if (!Number.isFinite(q.price)) return;
          const list = next[q.symbol] ? [...next[q.symbol]] : [];
          const prevPrice = list[list.length - 1]?.price ?? q.price;
          const delta = Math.abs(q.price - prevPrice);
          const volume = Math.round(900 + delta * 5000 + (q.price % 1) * 1000);
          const isUp = q.price >= prevPrice;

          list.push({
            time: new Date(q.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            }),
            price: q.price,
            volume,
            isUp
          });
          if (list.length > MAX_POINTS) list.shift();
          next[q.symbol] = list;
        });
        return next;
      });
    });

    return () => ws.close();
  }, []);

  return seriesBySymbol;
}

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

export default function Dashboard({ searchQuery, onOpenCompany }) {
  const [companies, setCompanies] = useState([]);
  const [activeSymbol, setActiveSymbol] = useState(() => getStoredSymbol());
  const rawSeries = useQuoteStream();

  useEffect(() => {
    let isMounted = true;
    const loadCompanies = () => {
      fetch("/api/companies")
        .then(r => r.json())
        .then(data => {
          if (isMounted) setCompanies(data);
        })
        .catch(() => {
          if (isMounted) setCompanies([]);
        });
    };

    loadCompanies();
    const id = setInterval(loadCompanies, 20000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const companySymbols = companies.map(c => c.symbol);
    const symbols = companySymbols.length > 0 ? companySymbols : Object.keys(rawSeries);
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

  const companyMap = useMemo(() => {
    const map = {};
    companies.forEach(c => {
      map[c.symbol] = c;
    });
    return map;
  }, [companies]);

  const fallbackSymbols = Object.keys(rawSeries);
  const sourceCompanies = companies.length > 0
    ? companies
    : fallbackSymbols.map(symbol => ({ symbol, name: symbol, sector: "Power" }));

  const tickerQuotes = useMemo(
    () =>
      sourceCompanies
        .map(company => {
          const series = rawSeries[company.symbol] || [];
          const last = series[series.length - 1];
          const prev = series[series.length - 2];
          const changePct =
            prev && last ? ((last.price - prev.price) / prev.price) * 100 : 0;

          return {
            symbol: company.symbol,
            price: last?.price ?? null,
            changePct
          };
        })
        .filter(item => Number.isFinite(item.price)),
    [sourceCompanies, rawSeries]
  );

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
      <section className="ticker-section">
        <div className="ticker-head">
          <span className="ticker-live-dot" />
          <span>Live Sticker</span>
        </div>
        <LiveTicker quotes={tickerQuotes} />
      </section>

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
