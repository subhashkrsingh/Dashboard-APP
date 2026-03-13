import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { formatPercent, formatPrice, formatSignedPrice, formatVolume } from "../../lib/formatters";
import type { CompanyQuote, PriceDirection } from "../../types/market";

type SortKey = "name" | "price" | "change" | "percentChange" | "volume";
type SortDirection = "asc" | "desc";

interface CompanyTableProps {
  companies: CompanyQuote[];
  signals: Record<string, PriceDirection>;
}

function compareNullableNumbers(
  left: number | null | undefined,
  right: number | null | undefined,
  direction: SortDirection
): number {
  const l = Number.isFinite(left) ? Number(left) : direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  const r = Number.isFinite(right) ? Number(right) : direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  return direction === "asc" ? l - r : r - l;
}

export function CompanyTable({ companies, signals }: CompanyTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("percentChange");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredAndSorted = useMemo(() => {
    const filtered = companies.filter(company => {
      const search = query.trim().toLowerCase();
      if (!search) return true;
      return company.symbol.toLowerCase().includes(search) || company.name.toLowerCase().includes(search);
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name": {
          const comparison = a.name.localeCompare(b.name);
          return sortDirection === "asc" ? comparison : -comparison;
        }
        case "price":
          return compareNullableNumbers(a.price, b.price, sortDirection);
        case "change":
          return compareNullableNumbers(a.change, b.change, sortDirection);
        case "percentChange":
          return compareNullableNumbers(a.percentChange, b.percentChange, sortDirection);
        case "volume":
          return compareNullableNumbers(a.volume, b.volume, sortDirection);
        default:
          return 0;
      }
    });

    return sorted;
  }, [companies, query, sortDirection, sortKey]);

  const setSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection(previous => (previous === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "name" ? "asc" : "desc");
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? "^" : "v";
  };

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/85 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-100">Power Company Table</h3>
          <p className="text-xs text-slate-400">Search, sort and monitor live price movements</p>
        </div>

        <input
          id="company-table-search"
          name="companyTableSearch"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          autoComplete="off"
          placeholder="Search by symbol or name"
          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/80">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-950/90 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">
                <button type="button" onClick={() => setSort("name")} className="inline-flex items-center gap-1">
                  Company {sortIndicator("name")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" onClick={() => setSort("price")} className="inline-flex items-center gap-1">
                  Price {sortIndicator("price")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" onClick={() => setSort("change")} className="inline-flex items-center gap-1">
                  Change {sortIndicator("change")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" onClick={() => setSort("percentChange")} className="inline-flex items-center gap-1">
                  % Change {sortIndicator("percentChange")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" onClick={() => setSort("volume")} className="inline-flex items-center gap-1">
                  Volume {sortIndicator("volume")}
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredAndSorted.map(company => {
              const isPositive = (company.percentChange ?? 0) >= 0;
              const signal = signals[company.symbol];
              const flashClass = signal === "up" ? "price-flash-up" : signal === "down" ? "price-flash-down" : "";

              return (
                <motion.tr
                  layout
                  key={company.symbol}
                  className={`border-t border-slate-800 bg-slate-900/40 hover:bg-slate-800/55 ${flashClass}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-100">{company.name}</p>
                    <p className="text-xs text-slate-400">{company.symbol}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-100">{formatPrice(company.price)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatSignedPrice(company.change)}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatPercent(company.percentChange)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{formatVolume(company.volume)}</td>
                </motion.tr>
              );
            })}
            {filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                  No companies match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
