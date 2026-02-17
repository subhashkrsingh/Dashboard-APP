import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const HISTORY_RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"];

function formatCurrency(value) {
  if (!Number.isFinite(value)) return "--";
  return `INR ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatSignedNumber(value) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatCompact(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toLocaleString(undefined, {
    notation: "compact",
    maximumFractionDigits: 2
  });
}

function formatDepthQty(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatChartLabel(timestamp, range) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  if (range === "1D") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

async function fetchJson(url) {
  const response = await fetch(url);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
}

function buildDepthRows(trade) {
  const bidRows = Array.isArray(trade?.bids) ? trade.bids : [];
  const askRows = Array.isArray(trade?.asks) ? trade.asks : [];
  const size = Math.max(bidRows.length, askRows.length, 5);
  return Array.from({ length: size }, (_, index) => ({
    bid: bidRows[index] || null,
    ask: askRows[index] || null
  }));
}

export default function CompanyDetails({ symbol }) {
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [historyRange, setHistoryRange] = useState("3M");
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    let alive = true;

    const loadOverview = async initialLoad => {
      if (initialLoad) setOverviewLoading(true);
      const { ok, status, data } = await fetchJson(`/api/company/${encodeURIComponent(symbol)}`);
      if (!alive) return;
      setOverview(data);
      if (!ok) {
        const fallback = data?.error || data?.warning || `Request failed (${status})`;
        setOverviewError(fallback);
      } else {
        setOverviewError("");
      }
      if (initialLoad) setOverviewLoading(false);
    };

    loadOverview(true);
    const id = setInterval(() => loadOverview(false), 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    let alive = true;

    const loadHistory = async () => {
      setHistoryLoading(true);
      const { ok, status, data } = await fetchJson(
        `/api/company/${encodeURIComponent(symbol)}/history?range=${encodeURIComponent(historyRange)}`
      );
      if (!alive) return;
      setHistory(Array.isArray(data?.points) ? data.points : []);
      if (!ok) {
        const fallback = data?.error || data?.warning || `Request failed (${status})`;
        setHistoryError(fallback);
      } else {
        setHistoryError(data?.warning || "");
      }
      setHistoryLoading(false);
    };

    loadHistory();
    return () => {
      alive = false;
    };
  }, [symbol, historyRange]);

  const company = overview?.company || {
    symbol: symbol || "-",
    name: symbol || "Company",
    sector: "Power"
  };
  const quote = overview?.quote || null;
  const trade = overview?.trade || null;

  const chartData = useMemo(() => {
    return history.map(item => ({
      ...item,
      label: formatChartLabel(item.timestamp, historyRange)
    }));
  }, [history, historyRange]);

  const depthRows = useMemo(() => buildDepthRows(trade), [trade]);

  const latestCandle = chartData[chartData.length - 1] || null;
  const rangeLow = chartData.length > 0 ? Math.min(...chartData.map(item => item.low)) : null;
  const rangeHigh = chartData.length > 0 ? Math.max(...chartData.map(item => item.high)) : null;

  const changeTone = (quote?.changePercent ?? 0) >= 0 ? "up" : "down";

  if (!symbol) {
    return <div className="empty">Select a company to view details.</div>;
  }

  return (
    <div className="company-page">
      <section className="section">
        <div className="section-header">
          <h2>{company.name}</h2>
          <p>
            {company.symbol} | {company.sector}
          </p>
        </div>
        {(overviewError || historyError) ? (
          <div className="api-warning">
            {[overviewError, historyError].filter(Boolean).join(" | ")}
          </div>
        ) : null}
      </section>

      <section className="section">
        <div className="metrics-grid">
          <article className="card metric-card">
            <p className="metric-label">Last Price</p>
            <p className="metric-value">{formatCurrency(quote?.price)}</p>
            <p className={`metric-sub ${changeTone}`}>{formatPercent(quote?.changePercent)}</p>
          </article>

          <article className="card metric-card">
            <p className="metric-label">Day Change</p>
            <p className="metric-value">{formatSignedNumber(quote?.change)}</p>
            <p className={`metric-sub ${changeTone}`}>{formatPercent(quote?.changePercent)}</p>
          </article>

          <article className="card metric-card">
            <p className="metric-label">Open / Prev Close</p>
            <p className="metric-value">{formatCurrency(quote?.open)}</p>
            <p className="metric-sub">Prev Close {formatCurrency(quote?.previousClose)}</p>
          </article>

          <article className="card metric-card">
            <p className="metric-label">Day Range</p>
            <p className="metric-value">{formatCurrency(quote?.low)}</p>
            <p className="metric-sub">to {formatCurrency(quote?.high)}</p>
          </article>

          <article className="card metric-card">
            <p className="metric-label">Volume</p>
            <p className="metric-value">{formatCompact(quote?.volume)}</p>
            <p className="metric-sub">Trades in current session</p>
          </article>

          <article className="card metric-card">
            <p className="metric-label">Bid / Ask</p>
            <p className="metric-value">{formatCurrency(trade?.bestBid)}</p>
            <p className="metric-sub">Ask {formatCurrency(trade?.bestAsk)}</p>
          </article>

          <article className="card metric-card">
            <p className="metric-label">Spread</p>
            <p className="metric-value">{formatSignedNumber(trade?.spread)}</p>
            <p className="metric-sub">Best ask - best bid</p>
          </article>

          <article className="card metric-card">
            <p className="metric-label">52W Range</p>
            <p className="metric-value">{formatCurrency(quote?.yearLow)}</p>
            <p className="metric-sub">to {formatCurrency(quote?.yearHigh)}</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <div className="section-header">
            <h2>Historical Data</h2>
            <p>Candles by selected range</p>
          </div>
          <div className="range-tabs">
            {HISTORY_RANGES.map(range => (
              <button
                key={range}
                type="button"
                className={`range-tab ${range === historyRange ? "active" : ""}`}
                onClick={() => setHistoryRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="card chart-card company-chart-card">
          {historyLoading ? (
            <p className="empty">Loading historical chart...</p>
          ) : chartData.length === 0 ? (
            <p className="empty">No historical candles available for this range.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis
                    yAxisId="price"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    domain={["dataMin", "dataMax"]}
                  />
                  <YAxis yAxisId="volume" orientation="right" hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                  <Legend />
                  <Bar
                    yAxisId="volume"
                    dataKey="volume"
                    name="Volume"
                    barSize={8}
                    fill="rgba(79,70,229,0.28)"
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    name="Close"
                    stroke="#7dd3fc"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              <div className="history-meta">
                <span>Latest Close: {formatCurrency(latestCandle?.close)}</span>
                <span>Range Low: {formatCurrency(rangeLow)}</span>
                <span>Range High: {formatCurrency(rangeHigh)}</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <div className="section-header">
            <h2>Trade Information</h2>
            <p>Live order depth and market activity</p>
          </div>
        </div>

        <div className="detail-grid">
          <div className="card depth-card">
            <div className="card-title">Order Book (Top Levels)</div>
            {overviewLoading ? (
              <p className="empty">Loading trade information...</p>
            ) : (
              <div className="depth-table-wrap">
                <table className="depth-table">
                  <thead>
                    <tr>
                      <th>Bid Qty</th>
                      <th>Bid</th>
                      <th>Ask</th>
                      <th>Ask Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depthRows.map((row, index) => (
                      <tr key={index}>
                        <td>{formatDepthQty(row.bid?.quantity)}</td>
                        <td>{formatCurrency(row.bid?.price)}</td>
                        <td>{formatCurrency(row.ask?.price)}</td>
                        <td>{formatDepthQty(row.ask?.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card snapshot-card">
            <div className="card-title">Session Snapshot</div>
            <table className="snapshot-table">
              <tbody>
                <tr>
                  <td>Total Bid Qty</td>
                  <td>{formatDepthQty(trade?.totalBidQty)}</td>
                </tr>
                <tr>
                  <td>Total Ask Qty</td>
                  <td>{formatDepthQty(trade?.totalAskQty)}</td>
                </tr>
                <tr>
                  <td>Average Traded Price</td>
                  <td>{formatCurrency(trade?.averageTradedPrice)}</td>
                </tr>
                <tr>
                  <td>Last Traded Quantity</td>
                  <td>{formatDepthQty(trade?.lastTradedQty)}</td>
                </tr>
                <tr>
                  <td>Session Volume</td>
                  <td>{formatCompact(trade?.volume)}</td>
                </tr>
                <tr>
                  <td>Last Update</td>
                  <td>
                    {quote?.timestamp
                      ? new Date(quote.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })
                      : "--"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

