function buildSparkPoints(series, width, height, padding) {
  if (!series || series.length === 0) return "";

  const values = series.map(point => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / (values.length - 1 || 1);

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y = padding + (height - padding * 2) * (1 - (value - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function getLineLength(points) {
  if (!points) return 0;
  const coords = points.split(" ").map(pair => pair.split(",").map(Number));
  let length = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const [x1, y1] = coords[i - 1];
    const [x2, y2] = coords[i];
    length += Math.hypot(x2 - x1, y2 - y1);
  }
  return length;
}

function getInitials(label) {
  if (!label) return "--";
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function LiveCard({
  name,
  symbol,
  price,
  changePct,
  sparkData,
  sparkKey,
  status,
  statusMessage,
  hasData,
  isActive,
  onSelect
}) {
  const isPositive = (changePct ?? 0) >= 0;
  const initials = getInitials(name || symbol);
  const width = 120;
  const height = 28;
  const points = buildSparkPoints(sparkData, width, height, 2);
  const length = getLineLength(points);
  const isDisabled = !hasData;
  const pillText =
    changePct == null
      ? "--"
      : `${isPositive ? "+" : "-"} ${Math.abs(changePct).toFixed(2)}%`;
  const priceText = price == null ? "No data" : `INR ${price.toFixed(2)}`;

  return (
    <button
      type="button"
      className={`live-card ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
      onClick={isDisabled ? undefined : onSelect}
      disabled={isDisabled}
    >
      <div className="live-card-header">
        <div className="live-card-title">
          <span className={`live-card-avatar ${hasData ? "live" : ""}`} aria-hidden="true">
            {initials}
          </span>
          <div>
            <p className="live-card-name">{name}</p>
            <span className="live-card-symbol">{symbol}</span>
          </div>
        </div>
        <span className={`pill ${isDisabled ? "muted" : isPositive ? "up" : "down"}`}>
          {pillText}
        </span>
      </div>
      <div className="live-card-body">
        <div className="live-card-price">{priceText}</div>
        {hasData && (
          <svg
            key={sparkKey}
            className={`sparkline ${isPositive ? "up" : "down"}`}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
          >
            <polyline
              points={points}
              style={{
                strokeDasharray: length,
                strokeDashoffset: length,
                "--spark-length": length
              }}
            />
          </svg>
        )}
      </div>
      <p className="live-card-meta">
        {hasData ? "Live data" : statusMessage ?? "Waiting for data"}
      </p>
    </button>
  );
}
