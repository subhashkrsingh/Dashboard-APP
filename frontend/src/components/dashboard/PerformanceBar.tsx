import type { CompanyQuote } from "../../types/market";

interface PerformanceBarProps {
  companies: CompanyQuote[];
}

export function PerformanceBar({ companies }: PerformanceBarProps) {
  const positives = companies.filter(company => (company.percentChange ?? 0) > 0).length;
  const negatives = companies.filter(company => (company.percentChange ?? 0) < 0).length;
  const flats = Math.max(0, companies.length - positives - negatives);
  const total = Math.max(companies.length, 1);

  const positivePct = (positives / total) * 100;
  const negativePct = (negatives / total) * 100;
  const flatPct = 100 - positivePct - negativePct;

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-slate-100">Sector Performance Bar</h3>
        <p className="text-xs text-slate-400">Advancers vs Decliners</p>
      </div>

      <div className="h-3 overflow-hidden rounded-full border border-slate-700/90 bg-slate-950">
        <div className="flex h-full w-full">
          <div className="h-full bg-emerald-500" style={{ width: `${positivePct}%` }} />
          <div className="h-full bg-slate-500" style={{ width: `${flatPct}%` }} />
          <div className="h-full bg-rose-500" style={{ width: `${negativePct}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <p className="text-emerald-300">Advancers: {positives}</p>
        <p className="text-slate-300">Flat: {flats}</p>
        <p className="text-rose-300 text-right">Decliners: {negatives}</p>
      </div>
    </section>
  );
}
