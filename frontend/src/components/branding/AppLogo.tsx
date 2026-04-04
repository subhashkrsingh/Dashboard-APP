interface AppLogoProps {
  compact?: boolean;
  subtitle?: string;
  className?: string;
  theme?: "light" | "dark";
}

const FULL_LOGO_SRC = "/energixchange-logo.png";
const MARK_LOGO_SRC = "/energixchange-mark.png";

export function AppLogo({
  compact = false,
  subtitle = "Market Intelligence Terminal",
  className = "",
  theme = "light"
}: AppLogoProps) {
  const frameClass =
    theme === "dark"
      ? "border-slate-700 bg-white/95 shadow-[0_12px_28px_rgba(15,23,42,0.32)]"
      : "border-blue-100 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]";
  const subtitleClass = theme === "dark" ? "text-slate-400" : "text-slate-500";

  if (compact) {
    return (
      <div className={`inline-flex items-center justify-center rounded-[22px] border p-2 ${frameClass} ${className}`.trim()}>
        <img src={MARK_LOGO_SRC} alt="EnergiXchange" className="block h-11 w-11 object-contain" />
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <div className={`rounded-[24px] border px-4 py-3 ${frameClass}`}>
        <img src={FULL_LOGO_SRC} alt="EnergiXchange" className="block h-12 w-auto max-w-full object-contain" />
      </div>
      {subtitle ? <p className={`mt-2 pl-1 text-[11px] uppercase tracking-[0.24em] ${subtitleClass}`}>{subtitle}</p> : null}
    </div>
  );
}
