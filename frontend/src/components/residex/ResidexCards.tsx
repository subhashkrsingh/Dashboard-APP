import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Building2, Home, Landmark, LineChart } from "lucide-react";

import { AnimatedNumber } from "../ui/AnimatedNumber";
import { formatPercent } from "../../lib/formatters";
import { formatResidexValue, useResidexContext } from "./ResidexContext";

const CARD_ICONS = {
  national: LineChart,
  city: Building2,
  affordable: Home,
  premium: Landmark
} as const;

function MiniSparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) {
    return <div className="h-12 rounded-xl bg-slate-100/80" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stroke = positive ? "#16a34a" : "#dc2626";
  const width = 120;
  const height = 40;
  const padding = 4;

  const path = values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ResidexCards() {
  const { summaryCards } = useResidexContext();

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {summaryCards.map(card => {
        const Icon = CARD_ICONS[card.id as keyof typeof CARD_ICONS] ?? LineChart;
        const positive = card.qoq >= 0;
        const toneClasses =
          card.tone === "positive"
            ? "from-emerald-50 to-white border-emerald-200 shadow-[0_12px_24px_rgba(22,163,74,0.08)]"
            : card.tone === "negative"
            ? "from-rose-50 to-white border-rose-200 shadow-[0_12px_24px_rgba(220,38,38,0.08)]"
            : "from-blue-50 to-white border-blue-200 shadow-[0_12px_24px_rgba(37,99,235,0.08)]";

        return (
          <motion.article
            key={card.id}
            layout
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className={`glass-card rounded-2xl border bg-gradient-to-br p-4 dark:border-slate-800 dark:bg-slate-950/80 ${toneClasses}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{card.title}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.subtitle}</p>
              </div>
              <span className="rounded-xl border border-white/70 bg-white/80 p-2 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <Icon className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <AnimatedNumber
                  value={card.value}
                  format={value => formatResidexValue(value)}
                  className="block font-display text-3xl font-semibold text-slate-900 dark:text-slate-100"
                />
                <div className={`mt-2 inline-flex items-center gap-1 text-sm font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                  {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {formatPercent(card.qoq)} QoQ
                </div>
              </div>

              <div className="w-28">
                <MiniSparkline values={card.sparkline} positive={positive} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/80 bg-white/75 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              <div>
                <p className="uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">QoQ</p>
                <p className={`mt-1 font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatPercent(card.qoq)}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">YoY</p>
                <p className={`mt-1 font-semibold ${card.yoy >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatPercent(card.yoy)}
                </p>
              </div>
            </div>
          </motion.article>
        );
      })}
    </section>
  );
}
