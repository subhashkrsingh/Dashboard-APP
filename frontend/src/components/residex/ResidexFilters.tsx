import { Search } from "lucide-react";

import { Badge } from "../ui/Badge";
import { useResidexContext, type ResidexQuarterFilter, type ResidexYearFilter } from "./ResidexContext";

const QUARTERS: ResidexQuarterFilter[] = ["Latest", "Q1", "Q2", "Q3", "Q4"];
const HOUSING_TYPES = [
  { value: "all", label: "All" },
  { value: "affordable", label: "Affordable" },
  { value: "premium", label: "Premium" },
  { value: "overall", label: "Overall" }
] as const;

export function ResidexFilters() {
  const {
    filters,
    filteredCities,
    years,
    selectedPeriodLabel,
    setCity,
    setQuarter,
    setYear,
    setHousingType,
    setSearchQuery,
    clearFilters
  } = useResidexContext();

  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-blue-600">Global Filters</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-slate-900">RESIDEX filter console</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Search a city, refine the quarter window, and switch the housing lens without leaving the dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{selectedPeriodLabel}</Badge>
          <Badge tone="neutral">{filteredCities.length} matched cities</Badge>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Search city
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              type="search"
              placeholder="Search city RESIDEX..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            City
          </span>
          <select
            value={filters.city}
            onChange={event => setCity(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="All">All Cities</option>
            {filteredCities.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Quarter
          </span>
          <select
            value={filters.quarter}
            onChange={event => setQuarter(event.target.value as ResidexQuarterFilter)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {QUARTERS.map(quarter => (
              <option key={quarter} value={quarter}>
                {quarter}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Year
          </span>
          <select
            value={String(filters.year)}
            onChange={event =>
              setYear(event.target.value === "Latest" ? "Latest" : (Number(event.target.value) as ResidexYearFilter))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="Latest">Latest</option>
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Housing Type</span>
        {HOUSING_TYPES.map(type => {
          const active = filters.housingType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => setHousingType(type.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-blue-300 bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(37,99,235,0.12)]"
                  : "border-slate-300 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
