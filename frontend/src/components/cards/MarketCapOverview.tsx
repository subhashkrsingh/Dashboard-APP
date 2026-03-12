import type { CompanyQuote } from "../../types/market";

interface MarketCapOverviewProps {
  companies: CompanyQuote[];
  marketCapBySymbol: Record<string, number>;
  sectorName: string;
}

function formatCrore(value: number) {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)} Cr`;
}

export function MarketCapOverview({ companies, marketCapBySymbol, sectorName }: MarketCapOverviewProps) {
  const rows = companies
    .map(company => ({
      ...company,
      marketCap: marketCapBySymbol[company.symbol] ?? null
    }))
    .filter(company => Number.isFinite(company.marketCap))
    .sort((left, right) => (right.marketCap ?? 0) - (left.marketCap ?? 0))
    .slice(0, 5);

  const totalMarketCap = rows.reduce((sum, company) => sum + (company.marketCap ?? 0), 0);
  const leader = rows[0];

  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4">
      <div className="mb-3">
        <h3 className="font-display text-lg font-semibold text-slate-900">Market Cap Overview</h3>
        <p className="text-xs text-slate-500">Top tracked names in {sectorName}</p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
          Total: {formatCrore(totalMarketCap)}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700">
          Leader: {leader?.symbol ?? "--"}
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(company => {
          const cap = company.marketCap ?? 0;
          const width = totalMarketCap > 0 ? Math.max(8, (cap / totalMarketCap) * 100) : 8;

          return (
            <article key={`cap-${company.symbol}`} className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{company.symbol}</span>
                <span>{formatCrore(cap)}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${width}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
