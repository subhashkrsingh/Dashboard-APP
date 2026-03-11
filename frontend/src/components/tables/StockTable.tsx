import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import type { CompanyHistoryPoint } from "../../hooks/useMarketHistory";
import { formatPercent, formatPrice, formatSignedPrice, formatVolume } from "../../lib/formatters";
import type { CompanyQuote, PriceDirection } from "../../types/market";
import { Sparkline } from "../ui/Sparkline";

type SortKey = "symbol" | "price" | "percentChange" | "volume";
type SortDirection = "asc" | "desc";

interface StockTableProps {
  companies: CompanyQuote[];
  historyBySymbol: Record<string, CompanyHistoryPoint[]>;
  signals: Record<string, PriceDirection>;
  query: string;
}

function compareNullableNumbers(
  left: number | null | undefined,
  right: number | null | undefined,
  direction: SortDirection
) {
  const l =
    Number.isFinite(left) && left !== null
      ? Number(left)
      : direction === "asc"
      ? Number.POSITIVE_INFINITY
      : Number.NEGATIVE_INFINITY;
  const r =
    Number.isFinite(right) && right !== null
      ? Number(right)
      : direction === "asc"
      ? Number.POSITIVE_INFINITY
      : Number.NEGATIVE_INFINITY;

  return direction === "asc" ? l - r : r - l;
}

function getRowFlash(signal: PriceDirection | undefined) {
  if (signal === "up") return "price-flash-up";
  if (signal === "down") return "price-flash-down";
  return "";
}

export function StockTable({ companies, historyBySymbol, signals, query }: StockTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("percentChange");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = companies.filter(item => {
      if (!normalizedQuery) return true;
      return (
        item.symbol.toLowerCase().includes(normalizedQuery) ||
        item.name.toLowerCase().includes(normalizedQuery)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "symbol": {
          const comparison = a.symbol.localeCompare(b.symbol);
          return sortDirection === "asc" ? comparison : -comparison;
        }
        case "price":
          return compareNullableNumbers(a.price, b.price, sortDirection);
        case "percentChange":
          return compareNullableNumbers(a.percentChange, b.percentChange, sortDirection);
        case "volume":
          return compareNullableNumbers(a.volume, b.volume, sortDirection);
        default:
          return 0;
      }
    });
  }, [companies, query, sortDirection, sortKey]);

  const setSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection(current => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "symbol" ? "asc" : "desc");
  };

  const getSortLabel = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? "^" : "v";
  };

  return (
    <section className="glass-card rounded-2xl border border-slate-700/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-100">Stock Table</h3>
          <p className="text-xs text-slate-400">Sticky header, sorting, and live sparkline trend</p>
        </div>
        <p className="text-xs text-slate-400">{filteredRows.length} symbols</p>
      </div>

      <div className="max-h-[430px] overflow-auto rounded-xl border border-slate-700/70 bg-[#0B1220]/70">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[#111A2C]/95 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">
                <button type="button" onClick={() => setSort("symbol")} className="inline-flex items-center gap-1">
                  Symbol {getSortLabel("symbol")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" onClick={() => setSort("price")} className="inline-flex items-center gap-1">
                  Price {getSortLabel("price")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => setSort("percentChange")}
                  className="inline-flex items-center gap-1"
                >
                  Change {getSortLabel("percentChange")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" onClick={() => setSort("volume")} className="inline-flex items-center gap-1">
                  Volume {getSortLabel("volume")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">Trend</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(company => {
              const positive = (company.percentChange ?? 0) >= 0;
              return (
                <motion.tr
                  layout
                  key={company.symbol}
                  className={`border-t border-slate-800/80 bg-[#111A2C]/35 hover:bg-[#111A2C]/65 ${getRowFlash(
                    signals[company.symbol]
                  )}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-100">{company.symbol}</p>
                    <p className="text-xs text-slate-500">{company.name}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-100">{formatPrice(company.price)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                    <span className="inline-flex flex-col items-end">
                      <span>{formatPercent(company.percentChange)}</span>
                      <span className="text-[11px] opacity-80">{formatSignedPrice(company.change)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{formatVolume(company.volume)}</td>
                  <td className="px-4 py-3">
                    <div className="ml-auto h-9 w-28">
                      <Sparkline points={historyBySymbol[company.symbol] ?? []} positive={positive} />
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                  No symbols matched your search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
