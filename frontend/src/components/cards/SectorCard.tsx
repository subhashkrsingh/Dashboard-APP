import { motion } from "framer-motion";

import { formatPrice, formatSignedPrice } from "../../lib/formatters";
import type { PriceDirection, SectorIndex } from "../../types/market";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { TrendIndicator } from "../ui/TrendIndicator";

interface SectorCardProps {
  sectorIndex: SectorIndex;
  signal?: PriceDirection;
}

function flashClass(signal?: PriceDirection) {
  if (signal === "up") return "price-flash-up";
  if (signal === "down") return "price-flash-down";
  return "";
}

export function SectorCard({ sectorIndex, signal }: SectorCardProps) {
  return (
    <motion.article
      layout
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.22 }}
      className={`glass-card ${flashClass(signal)} rounded-2xl border border-cyan-300/35 bg-gradient-to-br from-cyan-500/20 to-blue-500/8 p-4 shadow-[0_16px_30px_rgba(8,145,178,0.14)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">{sectorIndex.name || "SECTOR INDEX"}</p>
        <span className="rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100">IDX</span>
      </div>
      <AnimatedNumber
        value={sectorIndex.lastPrice}
        format={value => formatPrice(value)}
        className="mt-3 block text-2xl font-semibold text-slate-100"
      />
      <div className="mt-2 flex items-center justify-between">
        <TrendIndicator value={sectorIndex.percentChange} />
        <p className="text-xs text-slate-400">{formatSignedPrice(sectorIndex.change)} today</p>
      </div>
    </motion.article>
  );
}
