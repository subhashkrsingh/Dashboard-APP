const SESSION_START = { hour: 9, minute: 15 };
const SESSION_END = { hour: 15, minute: 30 };
const SESSION_INTERVAL_MINUTES = 5; // 5 minute bars

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

function generateIntradayTimes() {
  const times = [];
  let hour = SESSION_START.hour;
  let minute = SESSION_START.minute;

  while (hour < SESSION_END.hour || (hour === SESSION_END.hour && minute <= SESSION_END.minute)) {
    const padded = (n) => String(n).padStart(2, "0");
    times.push(`${padded(hour)}:${padded(minute)}`);

    minute += SESSION_INTERVAL_MINUTES;
    if (minute >= 60) {
      hour += 1;
      minute -= 60;
    }
  }

  return times;
}

function interpolateCurve(anchors, targetLength, baseSeed) {
  if (anchors.length === 0) return [];
  if (anchors.length === 1) return Array(targetLength).fill(anchors[0]);

  const result = [];
  const span = anchors.length - 1;

  // Generate multiple seeds that evolve over the session for more realistic variability
  const generateSessionSeed = (index, baseSeed) => {
    // Create time-based seed evolution - different seeds for different parts of the session
    const sessionProgress = index / targetLength; // 0 to 1 over the session
    const timeSeed = Math.floor(sessionProgress * 100); // Different seed every ~1% of session
    return baseSeed + timeSeed * 31; // Prime multiplier for better distribution
  };

  for (let i = 0; i < targetLength; i += 1) {
    const t = (i * span) / (targetLength - 1);
    const baseIndex = Math.floor(t);
    const frac = t - baseIndex;

    const a = anchors[baseIndex];
    const b = anchors[Math.min(baseIndex + 1, anchors.length - 1)];
    const interp = a + (b - a) * frac;

    // Use session-evolving seed for more realistic noise patterns
    const sessionSeed = generateSessionSeed(i, baseSeed);
    const seededRandom = (offset = 0) => {
      const x = Math.sin(sessionSeed * 0.001 + offset * 0.7) * 10000;
      return x - Math.floor(x);
    };

    // Add variable noise that changes over the session
    const noise = (seededRandom() - 0.5) * 0.002 * Math.abs(b - a || 1);

    result.push(interp + noise);
  }

  return result;
}

function buildSessionCurve({ open, lastPrice, dayHigh, dayLow }) {
  // Realistic intraday curve with pronounced movement and session-varying seeds.
  // Create visible price swings using the full day range with evolving randomness.

  const dayRange = dayHigh - dayLow;
  const baseSeed = Math.floor(open * lastPrice);

  // Generate multiple seeds for different phases of the trading session
  const generatePhaseSeed = (phaseIndex, baseSeed) => {
    return baseSeed + phaseIndex * 97; // Prime multiplier for different phases
  };

  const anchors = [];

  // Open
  anchors.push(open);

  // 09:30: Early move - towards high or low with volatility
  const earlySeed = generatePhaseSeed(1, baseSeed);
  const earlyDirection = (Math.sin(earlySeed * 0.001) * 10000 - Math.floor(Math.sin(earlySeed * 0.001) * 10000)) > 0.5 ? 1 : -1;
  anchors.push(
    clamp(
      open + earlyDirection * dayRange * 0.15,
      dayLow,
      dayHigh
    )
  );

  // 10:00: Morning swing - explore the range
  const morningSeed = generatePhaseSeed(2, baseSeed);
  const morningDirection = (Math.sin(morningSeed * 0.001) * 10000 - Math.floor(Math.sin(morningSeed * 0.001) * 10000)) > 0.5 ? 1 : -1;
  anchors.push(
    clamp(
      open + morningDirection * dayRange * 0.25,
      dayLow,
      dayHigh
    )
  );

  // 11:15: Mid-morning - peak or valley
  const midMorningSeed = generatePhaseSeed(3, baseSeed);
  const midMorningRandom = Math.sin(midMorningSeed * 0.001) * 10000 - Math.floor(Math.sin(midMorningSeed * 0.001) * 10000);
  anchors.push(
    clamp(
      dayHigh - dayRange * (0.1 + 0.2 * midMorningRandom),
      dayLow,
      dayHigh
    )
  );

  // 12:30: Lunch pull-back - come back towards open/mid
  const lunchSeed = generatePhaseSeed(4, baseSeed);
  const lunchRandom = Math.sin(lunchSeed * 0.001) * 10000 - Math.floor(Math.sin(lunchSeed * 0.001) * 10000);
  anchors.push(
    clamp(
      (open + lastPrice) / 2 + (lunchRandom - 0.5) * dayRange * 0.2,
      dayLow,
      dayHigh
    )
  );

  // 14:00: Post-lunch rally/dump
  const postLunchSeed = generatePhaseSeed(5, baseSeed);
  const postLunchDirection = lastPrice > open ? 1 : -1;
  anchors.push(
    clamp(
      lastPrice > open ? dayHigh - dayRange * 0.1 : dayLow + dayRange * 0.1,
      dayLow,
      dayHigh
    )
  );

  // 15:00: Late afternoon - pull towards close
  const lateAfternoonSeed = generatePhaseSeed(6, baseSeed);
  const lateAfternoonRandom = Math.sin(lateAfternoonSeed * 0.001) * 10000 - Math.floor(Math.sin(lateAfternoonSeed * 0.001) * 10000);
  anchors.push(
    clamp(
      open + (lastPrice - open) * 0.9 + (lateAfternoonRandom - 0.5) * dayRange * 0.05,
      dayLow,
      dayHigh
    )
  );

  // 15:30: Close
  anchors.push(clamp(lastPrice, dayLow, dayHigh));

  const times = generateIntradayTimes();
  const rawValues = interpolateCurve(anchors, times.length, baseSeed);

  return rawValues.map((value) => roundPrice(clamp(value, dayLow, dayHigh)));
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
  const time = generateIntradayTimes();

  return {
    time,
    value: values,
    source: getSeriesSource(snapshot),
    fetchedAt: snapshot?.fetchedAt ?? new Date().toISOString()
  };
}

module.exports = {
  buildIntradaySeries
};
