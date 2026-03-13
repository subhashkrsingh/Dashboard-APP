export function formatPrice(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));
}

export function formatSignedPrice(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return "--";
  const numeric = Number(value);
  const prefix = numeric > 0 ? "+" : "";
  return `${prefix}${formatPrice(numeric)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return "--";
  const numeric = Number(value);
  const prefix = numeric > 0 ? "+" : "";
  return `${prefix}${numeric.toFixed(2)}%`;
}

export function formatVolume(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value));
}

export function formatCompactNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 2,
    ...options
  }).format(Number(value));
}

export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "--";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata"
  }).format(parsed);
}

export function toShortTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(parsed);
}
