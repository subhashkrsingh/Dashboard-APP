import type { ReactNode } from "react";

type BadgeTone = "positive" | "negative" | "accent" | "neutral" | "warning";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  pulse?: boolean;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  positive: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
  negative: "border-rose-400/50 bg-rose-500/15 text-rose-200",
  accent: "border-cyan-400/55 bg-cyan-500/15 text-cyan-100",
  neutral: "border-slate-500/45 bg-slate-500/10 text-slate-200",
  warning: "border-amber-400/55 bg-amber-500/15 text-amber-100"
};

export function Badge({ children, tone = "neutral", pulse = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${
        TONE_CLASSES[tone]
      } ${pulse ? "shadow-[0_0_0_1px_rgba(6,182,212,0.35),0_0_18px_rgba(6,182,212,0.4)]" : ""}`}
    >
      {children}
    </span>
  );
}
