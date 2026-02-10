export default function Sidebar() {
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
        <button className="nav-item active">Dashboard</button>
        <button className="nav-item">Company Analysis</button>
        <button className="nav-item">Comparison</button>
        <button className="nav-item">Sector Insights</button>
        <button className="nav-item">Watchlist</button>
      </nav>

      <div className="sidebar-footer">
        <div className="status-dot" />
        <span>Live market feed</span>
      </div>
    </aside>
  );
}
