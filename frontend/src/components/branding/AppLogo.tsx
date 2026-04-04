import { useId } from "react";

interface AppLogoProps {
  compact?: boolean;
  subtitle?: string;
  className?: string;
  theme?: "light" | "dark";
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 44 : 56;
  const id = useId();
  const orangeId = `${id}-orange`;
  const greenId = `${id}-green`;
  const navyId = `${id}-navy`;
  const cyanId = `${id}-cyan`;
  const violetId = `${id}-violet`;

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={orangeId} x1="18" y1="10" x2="48" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="1" stopColor="#FACC15" />
        </linearGradient>
        <linearGradient id={greenId} x1="36" y1="8" x2="60" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E" />
          <stop offset="1" stopColor="#65A30D" />
        </linearGradient>
        <linearGradient id={navyId} x1="54" y1="30" x2="26" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id={cyanId} x1="34" y1="56" x2="16" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={violetId} x1="8" y1="38" x2="28" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#A21CAF" />
        </linearGradient>
      </defs>

      <g transform="translate(36 36)">
        <ellipse rx="11" ry="22" transform="rotate(0)" fill={`url(#${orangeId})`} />
        <ellipse rx="11" ry="22" transform="rotate(72)" fill={`url(#${greenId})`} />
        <ellipse rx="11" ry="22" transform="rotate(144)" fill={`url(#${navyId})`} />
        <ellipse rx="11" ry="22" transform="rotate(216)" fill={`url(#${cyanId})`} />
        <ellipse rx="11" ry="22" transform="rotate(288)" fill={`url(#${violetId})`} />
      </g>

      <circle cx="36" cy="36" r="15.5" fill="white" fillOpacity="0.94" />
      <circle cx="36" cy="36" r="4.5" fill="#D6D3C4" />
    </svg>
  );
}

export function AppLogo({
  compact = false,
  subtitle = "Market Intelligence Terminal",
  className = "",
  theme = "light"
}: AppLogoProps) {
  const titleClass = theme === "dark" ? "text-slate-50" : "text-[#1E3A8A]";
  const subtitleClass = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const surfaceClass = theme === "dark" ? "border-slate-700 bg-slate-950/60" : "border-blue-100 bg-white/80";

  if (compact) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-2xl border p-1.5 shadow-[0_10px_22px_rgba(15,23,42,0.08)] ${surfaceClass} ${className}`.trim()}
      >
        <BrandMark compact />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div className={`rounded-[22px] border p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.1)] ${surfaceClass}`}>
        <BrandMark />
      </div>

      <div className="min-w-0">
        <div className={`font-display text-[1.45rem] font-semibold tracking-[-0.04em] ${titleClass}`}>
          Energi<span className="bg-[linear-gradient(135deg,#84CC16,#16A34A)] bg-clip-text text-transparent">X</span>change
        </div>
        <p className={`text-[11px] uppercase tracking-[0.24em] ${subtitleClass}`}>{subtitle}</p>
      </div>
    </div>
  );
}
