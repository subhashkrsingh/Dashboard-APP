import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";

import { Badge } from "../ui/Badge";
import { formatResidexValue, useResidexContext, type ResidexQuarterFilter, type ResidexYearFilter } from "./ResidexContext";
import { highlightMatch, predictNextQuarters } from "../../lib/residexPredictions";

const QUARTERS: ResidexQuarterFilter[] = ["Latest", "Q1", "Q2", "Q3", "Q4"];
const HOUSING_TYPES = [
  { value: "all", label: "All" },
  { value: "affordable", label: "Affordable" },
  { value: "premium", label: "Premium" },
  { value: "overall", label: "Overall" }
] as const;

interface CitySuggestion {
  city: string;
  latestIndex: number;
  qoq: number;
  predictions: number[];
}

function ResidexSearchAutocomplete() {
  const {
    filters,
    cities,
    currentPeriodRows,
    tableRows,
    periods,
    setCity,
    setSearchQuery
  } = useResidexContext();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showForecast, setShowForecast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get city suggestions with latest data and predictions
  const suggestions = useMemo((): CitySuggestion[] => {
    if (!filters.searchQuery.trim()) return [];

    const query = filters.searchQuery.toLowerCase();
    const filteredCities = cities
      .filter(city => city !== "All" && city.toLowerCase().includes(query))
      .slice(0, 8); // Limit to 8 suggestions

    return filteredCities.map(city => {
      const latestRecord = currentPeriodRows.find(r => r.city === city);
      const cityRecords = tableRows.filter(r => r.city === city);
      const historicalData = cityRecords
        .sort((a, b) => new Date(a.quarter).getTime() - new Date(b.quarter).getTime())
        .slice(-8) // Last 8 quarters for prediction
        .map(r => r.residex);

      const predictions = predictNextQuarters(historicalData, 4);

      return {
        city,
        latestIndex: latestRecord?.residex || 0,
        qoq: latestRecord?.qoq || 0,
        predictions
      };
    });
  }, [filters.searchQuery, cities, currentPeriodRows, tableRows]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSelectCity(suggestions[selectedIndex].city);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, suggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setIsOpen(value.length > 0);
    setSelectedIndex(-1);
  };

  const handleSelectCity = (city: string) => {
    setCity(city);
    setSearchQuery(city);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (filters.searchQuery.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          value={filters.searchQuery}
          onChange={event => handleInputChange(event.target.value)}
          onFocus={handleInputFocus}
          type="search"
          placeholder="Search city RESIDEX..."
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {/* Forecast Toggle */}
      <div className="mt-2 flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={showForecast}
            onChange={e => setShowForecast(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
          />
          Show Forecast
        </label>
      </div>

      {/* Autocomplete Dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50 max-h-96 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => {
              const isSelected = index === selectedIndex;
              const TrendIcon = suggestion.qoq >= 0 ? TrendingUp : TrendingDown;
              const trendColor = suggestion.qoq >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

              return (
                <button
                  key={suggestion.city}
                  onClick={() => handleSelectCity(suggestion.city)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {highlightMatch(suggestion.city, filters.searchQuery)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-600 dark:text-slate-400">
                        <span>Index: {formatResidexValue(suggestion.latestIndex)}</span>
                        <div className={`flex items-center gap-1 ${trendColor}`}>
                          <TrendIcon className="h-3 w-3" />
                          <span>{suggestion.qoq.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mini forecast chart */}
                  {showForecast && suggestion.predictions.length > 0 && (
                    <div className="mt-2 h-8 w-full">
                      <svg className="h-full w-full" viewBox="0 0 100 20">
                        {/* Historical data (solid line) */}
                        <polyline
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="1.5"
                          points={suggestion.predictions.slice(0, 4).map((val, i) => `${20 + i * 20},${20 - (val / 400) * 16}`).join(' ')}
                        />
                        {/* Forecast data (dotted line) */}
                        <polyline
                          fill="none"
                          stroke="#6b7280"
                          strokeWidth="1.5"
                          strokeDasharray="2,2"
                          points={suggestion.predictions.map((val, i) => `${20 + i * 20},${20 - (val / 400) * 16}`).join(' ')}
                        />
                        <text x="85" y="8" className="fill-slate-500 text-xs">Predicted</text>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
          <p className="card-title text-blue-700">GLOBAL FILTERS</p>
          <h2 className="section-title mt-2 font-display text-xl">RESIDEX filter console</h2>
          <p className="subtle-text mt-1">
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
          <span className="card-title mb-2 block text-xs">
            Search city
          </span>
          <ResidexSearchAutocomplete />
        </label>

        <label className="block">
          <span className="card-title mb-2 block text-xs">
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
          <span className="card-title mb-2 block text-xs">
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
          <span className="card-title mb-2 block text-xs">
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
        <span className="card-title text-xs">Housing Type</span>
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
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
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
