const SESSION_TIMES = ["09:15", "09:45", "10:15", "11:00", "12:00", "13:00", "14:00", "15:00", "15:30"];

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function roundPrice(value) {
  return Number(value.toFixed(2));
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function resolveAnchorValues(snapshot, seedPrice) {
  const sectorIndex = snapshot?.sectorIndex ?? {};
  const lastPrice = toNumber(sectorIndex.lastPrice) ?? toNumber(seedPrice) ?? 1000;
  const previousClose = toNumber(sectorIndex.previousClose) ?? lastPrice;
  const open = toNumber(sectorIndex.open) ?? previousClose;
  const dayHigh = toNumber(sectorIndex.dayHigh) ?? Math.max(lastPrice, open) * 1.004;
  const dayLow = toNumber(sectorIndex.dayLow) ?? Math.min(lastPrice, open) * 0.996;

  return {
    open,
    lastPrice,
    dayHigh: Math.max(dayHigh, open, lastPrice),
    dayLow: Math.min(dayLow, open, lastPrice)
  };
}

function buildSessionCurve({ open, lastPrice, dayHigh, dayLow }) {
  const amplitude = Math.max(dayHigh - dayLow, Math.abs(lastPrice - open), open * 0.0025);
  const midpoint = (dayHigh + dayLow) / 2;

  const curve = [
    open,
    clamp(midpoint - amplitude * 0.18, dayLow, dayHigh),
    clamp(midpoint + amplitude * 0.1, dayLow, dayHigh),
    clamp(dayHigh - amplitude * 0.08, dayLow, dayHigh),
    clamp(midpoint - amplitude * 0.12, dayLow, dayHigh),
    clamp(midpoint + amplitude * 0.04, dayLow, dayHigh),
    clamp(dayLow + amplitude * 0.26, dayLow, dayHigh),
    clamp(midpoint + amplitude * 0.08, dayLow, dayHigh),
    clamp(lastPrice, dayLow, dayHigh)
  ];

  return curve.map(roundPrice);
}

function getSeriesSource(snapshot) {
  if (snapshot?.snapshot) return "snapshot";
  if (snapshot?.stale) return "stale";
  if (snapshot?.sectorIndex) return "live";
  return "synthetic";
}

function buildIntradaySeries(snapshot, options = {}) {
  const anchors = resolveAnchorValues(snapshot, options.seedPrice);
  const values = buildSessionCurve(anchors);

  return {
    time: SESSION_TIMES,
    value: values,
    source: getSeriesSource(snapshot),
    fetchedAt: snapshot?.fetchedAt ?? new Date().toISOString()
  };
}

module.exports = {
  buildIntradaySeries
};
