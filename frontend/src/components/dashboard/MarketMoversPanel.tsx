import { motion } from "framer-motion";

import { formatPercent, formatPrice } from "../../lib/formatters";
import type { CompanyQuote } from "../../types/market";

interface MarketMoversPanelProps {
  gainers: CompanyQuote[];
  losers: CompanyQuote[];
}

interface MoverListProps {
  title: string;
  data: CompanyQuote[];
  positive: boolean;
}

function MoverList({ title, data, positive }: MoverListProps) {
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-3">
      <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
      <div className="mt-3 space-y-2">
        {data.slice(0, 5).map(item => (
          <motion.div
            key={`${title}-${item.symbol}`}
            layout
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-slate-100">{item.symbol}</p>
              <p className="text-xs text-slate-400">{item.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-100">{formatPrice(item.price)}</p>
              <p className={`text-xs font-semibold ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                {formatPercent(item.percentChange)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function MarketMoversPanel({ gainers, losers }: MarketMoversPanelProps) {
  return (
    <aside className="space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4">
      <h3 className="font-display text-lg font-semibold text-slate-100">Market Movers</h3>
      <MoverList title="Top Gainers" data={gainers} positive />
      <MoverList title="Top Losers" data={losers} positive={false} />
    </aside>
  );
}
