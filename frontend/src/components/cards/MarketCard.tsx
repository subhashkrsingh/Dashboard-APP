import { motion } from "framer-motion";
import type { ReactNode } from "react";

import type { PriceDirection } from "../../types/market";
import { TrendIndicator } from "../ui/TrendIndicator";

interface MarketCardProps {
  title: string;
  value: string;
  subtitle: string;
  change?: number | null;
  icon?: ReactNode;
  tone?: "positive" | "negative" | "accent" | "neutral";
  signal?: PriceDirection;
}

const TONE_CLASSES: Record<NonNullable<MarketCardProps["tone"]>, string> = {
  positive:
    "from-emerald-50 to-white border-emerald-200 shadow-[0_12px_24px_rgba(22,163,74,0.08)]",
  negative:
    "from-rose-50 to-white border-rose-200 shadow-[0_12px_24px_rgba(220,38,38,0.08)]",
  accent:
    "from-blue-50 to-white border-blue-200 shadow-[0_12px_24px_rgba(37,99,235,0.08)]",
  neutral:
    "from-slate-50 to-white border-slate-200 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
};

function flashClass(signal?: PriceDirection) {
  if (signal === "up") return "price-flash-up";
  if (signal === "down") return "price-flash-down";
  return "";
}

export function MarketCard({
  title,
  value,
  subtitle,
  change = null,
  icon = null,
  tone = "neutral",
  signal
}: MarketCardProps) {
  return (
    <motion.article
      layout
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`glass-card ${flashClass(signal)} rounded-2xl border bg-gradient-to-br p-4 ${TONE_CLASSES[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{title}</p>
        {icon ? (
          <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">{icon}</span>
        ) : null}
      </div>
      <p className="mt-3 truncate text-2xl font-semibold text-slate-900">{value}</p>
      <div className="mt-2 flex items-center justify-between">
        <TrendIndicator value={change} />
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </motion.article>
  );
}
