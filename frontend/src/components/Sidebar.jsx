function compactTicker(symbol) {
  if (!symbol) return "Company Detail";
  return symbol.replace(/^NSE:/, "").replace(/-EQ$/, "");
}

export default function Sidebar({ activePage, companySymbol, onOpenDashboard }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">PM</div>
        <div>
          <div className="brand-title">PowerMarket</div>
          <div className="brand-subtitle">Sector Intelligence</div>
        </div>
      </div>

      <nav className="nav">
        <button
          type="button"
          className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
          onClick={onOpenDashboard}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`nav-item ${activePage === "company" ? "active" : ""} ${companySymbol ? "" : "ghost"}`}
          disabled={!companySymbol}
        >
          {compactTicker(companySymbol)}
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="status-dot" />
        <span>Live market feed</span>
      </div>
    </aside>
  );
}
