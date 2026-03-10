import { formatPercent, formatPrice, formatVolume } from "../../lib/formatters";
import type { CompanyQuote } from "../../types/market";

interface FundamentalsPanelProps {
  companies: CompanyQuote[];
  sectorPrice: number | null;
  sectorPercentChange: number | null;
  advances?: number;
  declines?: number;
}

export function FundamentalsPanel({
  companies,
  sectorPrice,
  sectorPercentChange,
  advances,
  declines
}: FundamentalsPanelProps) {
  const totalVolume = companies.reduce((sum, company) => sum + (company.volume ?? 0), 0);
  const averageChange =
    companies.length > 0
      ? companies.reduce((sum, company) => sum + (company.percentChange ?? 0), 0) / companies.length
      : 0;

  const highestVolume = [...companies].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];

  const rows = [
    { label: "Sector Spot", value: formatPrice(sectorPrice) },
    { label: "Sector Change %", value: formatPercent(sectorPercentChange) },
    { label: "Average Company Change", value: formatPercent(averageChange) },
    { label: "Total Traded Volume", value: formatVolume(totalVolume) },
    { label: "Highest Volume", value: highestVolume ? `${highestVolume.symbol} (${formatVolume(highestVolume.volume)})` : "--" },
    {
      label: "Breadth",
      value: `${advances ?? 0} Adv / ${declines ?? 0} Dec`
    }
  ];

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4">
      <h3 className="font-display text-lg font-semibold text-slate-100">Fundamentals Panel</h3>
      <p className="mt-1 text-xs text-slate-400">Core sector metrics at a glance</p>

      <dl className="mt-4 space-y-2">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2.5">
            <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">{row.label}</dt>
            <dd className="text-sm font-semibold text-slate-100">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
