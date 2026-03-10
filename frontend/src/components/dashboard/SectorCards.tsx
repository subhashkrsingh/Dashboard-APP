import { motion } from "framer-motion";

import { formatPercent, formatPrice, formatSignedPrice, formatVolume } from "../../lib/formatters";
import type { CompanyQuote, MarketStatus, PriceDirection, SectorIndex } from "../../types/market";

interface SectorCardsProps {
  sectorIndex: SectorIndex;
  gainers: CompanyQuote[];
  losers: CompanyQuote[];
  companies: CompanyQuote[];
  marketStatus?: MarketStatus;
  signals: Record<string, PriceDirection>;
}

function cardFlashClass(signal: PriceDirection | undefined) {
  if (signal === "up") return "price-flash-up";
  if (signal === "down") return "price-flash-down";
  return "";
}

export function SectorCards({
  sectorIndex,
  gainers,
  losers,
  companies,
  marketStatus,
  signals
}: SectorCardsProps) {
  const topGainer = gainers[0];
  const topLoser = losers[0];
  const totalVolume = companies.reduce((sum, company) => sum + (company.volume ?? 0), 0);

  const cards = [
    {
      key: "sector",
      title: sectorIndex.name || "NIFTY POWER",
      value: formatPrice(sectorIndex.lastPrice),
      metric: formatPercent(sectorIndex.percentChange),
      sub: formatSignedPrice(sectorIndex.change),
      tone: (sectorIndex.percentChange ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300",
      signal: signals.__sector
    },
    {
      key: "gainer",
      title: "Top Gainer",
      value: topGainer?.symbol ?? "--",
      metric: formatPercent(topGainer?.percentChange),
      sub: formatPrice(topGainer?.price),
      tone: "text-emerald-300",
      signal: topGainer ? signals[topGainer.symbol] : undefined
    },
    {
      key: "loser",
      title: "Top Loser",
      value: topLoser?.symbol ?? "--",
      metric: formatPercent(topLoser?.percentChange),
      sub: formatPrice(topLoser?.price),
      tone: "text-rose-300",
      signal: topLoser ? signals[topLoser.symbol] : undefined
    },
    {
      key: "volume",
      title: "Total Market Volume",
      value: formatVolume(totalVolume),
      metric: marketStatus?.label ?? "--",
      sub: "Tracked universe",
      tone: "text-cyan-200",
      signal: "flat" as PriceDirection
    }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => (
        <motion.article
          key={card.key}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4 shadow-[0_18px_40px_rgba(2,8,23,0.45)] ${cardFlashClass(card.signal)}`}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.title}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">{card.value}</p>
          <p className={`mt-2 text-sm font-semibold ${card.tone}`}>{card.metric}</p>
          <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
        </motion.article>
      ))}
    </section>
  );
}
