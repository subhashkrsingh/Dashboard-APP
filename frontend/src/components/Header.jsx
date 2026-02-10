export default function Header() {
  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Power Sector Dashboard</p>
        <h1>Market Overview</h1>
      </div>

      <div className="topbar-actions">
        <div className="search">
          <input
            placeholder="Search ticker or company"
            aria-label="Search"
          />
        </div>
        <div className="date-chip">{dateLabel}</div>
      </div>
    </header>
  );
}
