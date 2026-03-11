import { motion } from "framer-motion";

import type { PriceDirection } from "../../types/market";
import { TrendIndicator } from "../ui/TrendIndicator";

interface MarketCardProps {
  title: string;
  value: string;
  subtitle: string;
  change?: number | null;
  icon: string;
  tone?: "positive" | "negative" | "accent" | "neutral";
  signal?: PriceDirection;
}

const TONE_CLASSES: Record<NonNullable<MarketCardProps["tone"]>, string> = {
  positive:
    "from-emerald-500/18 to-emerald-500/5 border-emerald-400/35 shadow-[0_16px_30px_rgba(16,185,129,0.12)]",
  negative:
    "from-rose-500/18 to-rose-500/5 border-rose-400/30 shadow-[0_16px_30px_rgba(225,29,72,0.14)]",
  accent:
    "from-cyan-500/20 to-blue-500/8 border-cyan-300/30 shadow-[0_16px_30px_rgba(8,145,178,0.15)]",
  neutral:
    "from-slate-500/15 to-slate-500/5 border-slate-400/25 shadow-[0_16px_30px_rgba(15,23,42,0.3)]"
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
  icon,
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
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{title}</p>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200">{icon}</span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold text-slate-100">{value}</p>
      <div className="mt-2 flex items-center justify-between">
        <TrendIndicator value={change} />
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </motion.article>
  );
}
