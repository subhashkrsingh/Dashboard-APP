export function toPercentChange(series) {
  if (!series || series.length === 0) return [];
  const base = series[0].price;
  return series.map(p => ({
    ...p,
    value: +(((p.price - base) / base) * 100).toFixed(2)
  }));
}

export function toIndexed(series, baseIndex = 100) {
  if (!series || series.length === 0) return [];
  const base = series[0].price;
  return series.map(p => ({
    ...p,
    value: +((p.price / base) * baseIndex).toFixed(2)
  }));
}

export function toRaw(series) {
  if (!series) return [];
  return series.map(p => ({
    ...p,
    value: p.price
  }));
}
