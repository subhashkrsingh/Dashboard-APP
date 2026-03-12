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
  title?: string;
  subtitle?: string;
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

export function StockTable({
  companies,
  historyBySymbol,
  signals,
  query,
  title = "Power Stocks Table",
  subtitle = "Sticky header, sorting, filtering, and mini trends"
}: StockTableProps) {
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
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <p className="text-xs text-slate-500">{filteredRows.length} symbols</p>
      </div>

      <div className="max-h-[430px] overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
                  className={`border-t border-slate-200 bg-white hover:bg-blue-50/45 ${getRowFlash(
                    signals[company.symbol]
                  )}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{company.symbol}</p>
                    <p className="text-xs text-slate-500">{company.name}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatPrice(company.price)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                    <span className="inline-flex flex-col items-end">
                      <span>{formatPercent(company.percentChange)}</span>
                      <span className="text-[11px] opacity-80">{formatSignedPrice(company.change)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatVolume(company.volume)}</td>
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
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
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
