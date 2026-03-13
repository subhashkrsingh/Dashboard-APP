import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";

import { formatPrice, formatVolume } from "../../lib/formatters";
import type { SectorAnalytics } from "../../lib/sectorAnalytics";
import type { PriceDirection, SectorSnapshot } from "../../types/market";
import { MarketCard } from "../cards/MarketCard";
import { SectorCard } from "../cards/SectorCard";

interface SectorSummaryCardsProps {
  data: SectorSnapshot;
  analytics: SectorAnalytics;
  signals: Record<string, PriceDirection>;
}

export function SectorSummaryCards({ data, analytics, signals }: SectorSummaryCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <SectorCard sectorIndex={data.sectorIndex} signal={signals.__sector} />

      <MarketCard
        title="Top Gainer"
        value={analytics.topGainer?.symbol ?? "--"}
        subtitle={formatPrice(analytics.topGainer?.price)}
        change={analytics.topGainer?.percentChange}
        icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
        tone="positive"
        signal={analytics.topGainer ? signals[analytics.topGainer.symbol] : undefined}
      />

      <MarketCard
        title="Top Loser"
        value={analytics.topLoser?.symbol ?? "--"}
        subtitle={formatPrice(analytics.topLoser?.price)}
        change={analytics.topLoser?.percentChange}
        icon={<TrendingDown className="h-3.5 w-3.5 text-rose-600" />}
        tone="negative"
        signal={analytics.topLoser ? signals[analytics.topLoser.symbol] : undefined}
      />

      <MarketCard
        title="Volume Leader"
        value={analytics.volumeLeader?.symbol ?? "--"}
        subtitle={formatVolume(analytics.volumeLeader?.volume)}
        change={analytics.volumeLeader?.percentChange}
        icon={<BarChart3 className="h-3.5 w-3.5 text-blue-600" />}
        tone="accent"
        signal={analytics.volumeLeader ? signals[analytics.volumeLeader.symbol] : undefined}
      />
    </section>
  );
}
