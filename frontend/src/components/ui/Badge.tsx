import type { ReactNode } from "react";

type BadgeTone = "positive" | "negative" | "accent" | "neutral" | "warning";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  pulse?: boolean;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  positive: "border-emerald-300 bg-emerald-50 text-emerald-700",
  negative: "border-rose-300 bg-rose-50 text-rose-700",
  accent: "border-blue-300 bg-blue-50 text-blue-700",
  neutral: "border-slate-300 bg-white text-slate-700",
  warning: "border-amber-300 bg-amber-50 text-amber-700"
};

export function Badge({ children, tone = "neutral", pulse = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${
        TONE_CLASSES[tone]
      } ${pulse ? "shadow-[0_0_0_1px_rgba(37,99,235,0.2),0_0_14px_rgba(37,99,235,0.18)]" : ""}`}
    >
      {children}
    </span>
  );
}
