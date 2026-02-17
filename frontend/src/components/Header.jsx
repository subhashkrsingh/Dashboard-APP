export default function Header({
  eyebrow,
  title,
  subtitle,
  showSearch = true,
  searchValue = "",
  onSearchChange,
  onBack
}) {
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
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle ? <p className="topbar-subtitle">{subtitle}</p> : null}
      </div>

      <div className="topbar-actions">
        {onBack ? (
          <button type="button" className="back-btn" onClick={onBack}>
            Back to Dashboard
          </button>
        ) : null}
        {showSearch ? (
          <div className="search">
            <input
              value={searchValue}
              onChange={event => onSearchChange?.(event.target.value)}
              placeholder="Search ticker or company"
              aria-label="Search"
            />
          </div>
        ) : null}
        <div className="date-chip">{dateLabel}</div>
      </div>
    </header>
  );
}
