import { useEffect, useMemo, useState } from "react";

import { compareResidexPeriods, type ResidexRecord } from "../../services/residexService";
import { formatPercent } from "../../lib/formatters";
import { formatResidexValue, useResidexContext } from "./ResidexContext";

type SortKey = "city" | "quarter" | "national" | "residex" | "affordable" | "premium" | "qoq" | "yoy";
type SortDirection = "asc" | "desc";

function exportRowsToCsv(rows: ResidexRecord[]) {
  const headers = ["City", "Quarter", "National", "City Index", "Affordable", "Premium", "QoQ", "YoY"];
  const csvRows = rows.map(row =>
    [row.city, row.quarter, row.national, row.residex, row.affordable, row.premium, row.qoq, row.yoy].join(",")
  );
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `residex-table-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function compareNumbers(left: number, right: number, direction: SortDirection) {
  return direction === "asc" ? left - right : right - left;
}

export function ResidexTable() {
  const { tableRows, filters, selectedPeriodLabel } = useResidexContext();
  const [sortKey, setSortKey] = useState<SortKey>("quarter");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sortedRows = useMemo(() => {
    return [...tableRows].sort((left, right) => {
      switch (sortKey) {
        case "city":
          return sortDirection === "asc" ? left.city.localeCompare(right.city) : right.city.localeCompare(left.city);
        case "quarter": {
          const comparison = compareResidexPeriods(left.quarter, right.quarter);
          return sortDirection === "asc" ? comparison : -comparison;
        }
        case "national":
          return compareNumbers(left.national, right.national, sortDirection);
        case "residex":
          return compareNumbers(left.residex, right.residex, sortDirection);
        case "affordable":
          return compareNumbers(left.affordable, right.affordable, sortDirection);
        case "premium":
          return compareNumbers(left.premium, right.premium, sortDirection);
        case "qoq":
          return compareNumbers(left.qoq, right.qoq, sortDirection);
        case "yoy":
          return compareNumbers(left.yoy, right.yoy, sortDirection);
        default:
          return 0;
      }
    });
  }, [sortDirection, sortKey, tableRows]);

  useEffect(() => {
    setPage(1);
  }, [filters.city, filters.quarter, filters.year, filters.housingType, filters.searchQuery]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const currentRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection(current => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "city" || nextKey === "quarter" ? "asc" : "desc");
  }

  function sortLabel(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? "^" : "v";
  }

  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title font-display text-xl">RESIDEX Data Table</h3>
          <p className="subtle-text mt-1">
            Sort, filter, paginate, and export the current RESIDEX slice. Default focus is {selectedPeriodLabel}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {sortedRows.length} rows
          </span>
          <button
            type="button"
            onClick={() => exportRowsToCsv(sortedRows)}
            className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
        <table className="min-w-full border-collapse text-sm dark:text-slate-200">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              {([
                ["city", "City"],
                ["quarter", "Quarter"],
                ["national", "National"],
                ["residex", "City Index"],
                ["affordable", "Affordable"],
                ["premium", "Premium"],
                ["qoq", "QoQ"],
                ["yoy", "YoY"]
              ] as Array<[SortKey, string]>).map(([key, label]) => (
                <th key={key} className="px-4 py-3 text-left">
                  <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1">
                    {label} {sortLabel(key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map(row => (
              <tr key={`${row.city}-${row.quarter}`} className="border-t border-slate-200 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{row.city}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.quarter}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatResidexValue(row.national)}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatResidexValue(row.residex)}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatResidexValue(row.affordable)}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatResidexValue(row.premium)}</td>
                <td className={`px-4 py-3 font-semibold ${row.qoq >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatPercent(row.qoq)}
                </td>
                <td className={`px-4 py-3 font-semibold ${row.yoy >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatPercent(row.yoy)}
                </td>
              </tr>
            ))}

            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-700 dark:text-slate-400">
                  No rows match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-400">
          Showing {(page - 1) * pageSize + (currentRows.length ? 1 : 0)}-
          {(page - 1) * pageSize + currentRows.length} of {sortedRows.length}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Previous
          </button>
          <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
