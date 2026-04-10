import {
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  compareResidexPeriods,
  getAffordableIndex,
  getNationalResidex,
  getPremiumIndex,
  getResidexCities,
  getResidexDataset,
  getResidexPeriods,
  type ResidexHousingType,
  type ResidexPeriod,
  type ResidexQuarter,
  type ResidexRecord
} from "../../services/residexService";

export type ResidexMetricMode = "overall" | "affordable" | "premium";
export type ResidexTab = "overview" | "cities" | "affordable" | "premium" | "table";
export type ResidexComparisonSort = "index" | "qoq" | "yoy";
export type ResidexQuarterFilter = ResidexQuarter | "Latest";
export type ResidexYearFilter = number | "Latest";

export interface ResidexCardMetric {
  id: string;
  title: string;
  subtitle: string;
  value: number;
  qoq: number;
  yoy: number;
  sparkline: number[];
  tone: "accent" | "positive" | "negative" | "neutral";
}

export interface ResidexComparisonRow extends ResidexRecord {
  value: number;
  selected: boolean;
}

export interface ResidexHeatmapRow {
  city: string;
  values: Array<{
    quarter: string;
    value: number;
  }>;
}

export interface ResidexHighlightCard {
  title: string;
  value: string;
  detail: string;
  tone: "accent" | "positive" | "warning" | "neutral";
}

export interface ResidexMapCityPoint {
  city: string;
  quarter: string;
  residex: number;
  qoq: number;
  yoy: number;
}

interface ResidexFiltersState {
  city: string;
  quarter: ResidexQuarterFilter;
  year: ResidexYearFilter;
  housingType: ResidexHousingType;
  searchQuery: string;
}

interface ResidexContextValue {
  loading: boolean;
  error: string | null;
  filters: ResidexFiltersState;
  activeTab: ResidexTab;
  trendMode: ResidexMetricMode;
  comparisonSort: ResidexComparisonSort;
  cities: string[];
  filteredCities: string[];
  years: number[];
  periods: ResidexPeriod[];
  selectedPeriod: ResidexPeriod | null;
  selectedPeriodLabel: string;
  selectedCityLabel: string;
  trendLabel: string;
  summaryCards: ResidexCardMetric[];
  nationalTrend: Array<Record<string, number | string | boolean>>;
  comparisonRows: ResidexComparisonRow[];
  selectedCityTrend: Array<Record<string, number | string | boolean>>;
  heatmapColumns: string[];
  heatmapRows: ResidexHeatmapRow[];
  premiumHighlights: ResidexHighlightCard[];
  currentPeriodRows: ResidexRecord[];
  mapCityPoints: ResidexMapCityPoint[];
  tableRows: ResidexRecord[];
  headerStats: Array<{ label: string; value: string }>;
  refreshKey: number;
  setCity: (city: string) => void;
  setQuarter: (quarter: ResidexQuarterFilter) => void;
  setYear: (year: ResidexYearFilter) => void;
  setHousingType: (type: ResidexHousingType) => void;
  setSearchQuery: (value: string) => void;
  setActiveTab: (tab: ResidexTab) => void;
  setTrendMode: (mode: ResidexMetricMode) => void;
  setComparisonSort: (sort: ResidexComparisonSort) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
}

const ResidexContext = createContext<ResidexContextValue | null>(null);

const DEFAULT_FILTERS: ResidexFiltersState = {
  city: "All",
  quarter: "Latest",
  year: "Latest",
  housingType: "all",
  searchQuery: ""
};

const TAB_LABELS: Record<ResidexTab, string> = {
  overview: "Overview",
  cities: "Cities",
  affordable: "Affordable",
  premium: "Premium",
  table: "Table"
};

function round(value: number) {
  return Number(value.toFixed(1));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return round(((current - previous) / previous) * 100);
}

export function formatResidexValue(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(Number(value));
}

export function formatResidexShortPeriod(label: string) {
  const [quarter, year] = label.split("-");
  return `${quarter} '${year.slice(-2)}`;
}

function getMetricValue(record: ResidexRecord, metric: ResidexMetricMode) {
  if (metric === "affordable") return record.affordable;
  if (metric === "premium") return record.premium;
  return record.residex;
}

function buildAggregateSeries(records: ResidexRecord[], label: string) {
  const grouped = new Map<string, ResidexRecord[]>();

  for (const record of records) {
    const bucket = grouped.get(record.quarter) ?? [];
    bucket.push(record);
    grouped.set(record.quarter, bucket);
  }

  const series = [...grouped.entries()]
    .map(([quarter, rows]) => {
      const template = rows[0];
      return {
        city: label,
        quarter,
        quarterCode: template.quarterCode,
        year: template.year,
        national: average(rows.map(row => row.national)),
        residex: average(rows.map(row => row.residex)),
        affordable: average(rows.map(row => row.affordable)),
        premium: average(rows.map(row => row.premium)),
        qoq: 0,
        yoy: 0
      } satisfies ResidexRecord;
    })
    .sort((left, right) => compareResidexPeriods(left.quarter, right.quarter));

  return series.map((record, index) => ({
    ...record,
    qoq: index > 0 ? percentChange(record.residex, series[index - 1].residex) : 0,
    yoy: index > 3 ? percentChange(record.residex, series[index - 4].residex) : 0
  }));
}

function getSeriesMetricChange(series: ResidexRecord[], metric: ResidexMetricMode, periodLabel: string) {
  const index = series.findIndex(record => record.quarter === periodLabel);

  if (index < 0) {
    return { qoq: 0, yoy: 0 };
  }

  const current = getMetricValue(series[index], metric);
  const previous = index > 0 ? getMetricValue(series[index - 1], metric) : null;
  const yearAgo = index > 3 ? getMetricValue(series[index - 4], metric) : null;

  return {
    qoq: previous ? percentChange(current, previous) : 0,
    yoy: yearAgo ? percentChange(current, yearAgo) : 0
  };
}

function sortPeriods(periods: ResidexPeriod[]) {
  return [...periods].sort((left, right) => compareResidexPeriods(left.label, right.label));
}

function resolveSelectedPeriod(periods: ResidexPeriod[], quarter: ResidexQuarterFilter, year: ResidexYearFilter) {
  if (!periods.length) return null;

  const sorted = sortPeriods(periods);
  const latest = sorted[sorted.length - 1];

  if (quarter === "Latest" && year === "Latest") {
    return latest;
  }

  if (quarter === "Latest" && year !== "Latest") {
    const matches = sorted.filter(period => period.year === year);
    return matches[matches.length - 1] ?? latest;
  }

  if (quarter !== "Latest" && year === "Latest") {
    const matches = sorted.filter(period => period.quarterCode === quarter);
    return matches[matches.length - 1] ?? latest;
  }

  return sorted.find(period => period.quarterCode === quarter && period.year === year) ?? latest;
}

function metricFromHousingType(housingType: ResidexHousingType): ResidexMetricMode {
  if (housingType === "affordable") return "affordable";
  if (housingType === "premium") return "premium";
  return "overall";
}

function getTone(value: number): "accent" | "positive" | "negative" | "neutral" {
  if (value > 2.5) return "positive";
  if (value < 0) return "negative";
  return "accent";
}

function buildSparkline(series: ResidexRecord[], metric: ResidexMetricMode) {
  return series.slice(-8).map(record => getMetricValue(record, metric));
}

function filterTableRows(records: ResidexRecord[], filters: ResidexFiltersState, latestPeriod: string | null) {
  return records.filter(record => {
    if (filters.city !== "All" && record.city !== filters.city) {
      return false;
    }

    if (filters.year === "Latest" && filters.quarter === "Latest") {
      return record.quarter === latestPeriod;
    }

    if (filters.year !== "Latest" && record.year !== filters.year) {
      return false;
    }

    if (filters.quarter !== "Latest" && record.quarterCode !== filters.quarter) {
      return false;
    }

    return true;
  });
}

export function ResidexProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<ResidexRecord[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [periods, setPeriods] = useState<ResidexPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ResidexFiltersState>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<ResidexTab>("overview");
  const [trendMode, setTrendMode] = useState<ResidexMetricMode>("overall");
  const [comparisonSort, setComparisonSort] = useState<ResidexComparisonSort>("index");
  const [headerStats, setHeaderStats] = useState<Array<{ label: string; value: string }>>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const deferredSearchQuery = useDeferredValue(filters.searchQuery);

  async function loadResidex() {
    setLoading(true);
    setError(null);

    try {
      const [dataset, cityList, periodList, national, affordable, premium] = await Promise.all([
        getResidexDataset(),
        getResidexCities(),
        getResidexPeriods(),
        getNationalResidex(),
        getAffordableIndex(),
        getPremiumIndex()
      ]);

      setRecords(dataset);
      setCities(cityList);
      setPeriods(sortPeriods(periodList));
      setHeaderStats([
        { label: "Latest National", value: formatResidexValue(national.national) },
        { label: "Affordable Basket", value: formatResidexValue(affordable.affordable) },
        { label: "Premium Basket", value: formatResidexValue(premium.premium) }
      ]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load RESIDEX mock data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResidex();
  }, []);

  useEffect(() => {
    if (!cities.length || !deferredSearchQuery.trim()) return;

    const query = deferredSearchQuery.trim().toLowerCase();
    const match = cities.find(city => city.toLowerCase().includes(query));

    if (match && match !== filters.city) {
      setFilters(current => ({
        ...current,
        city: match
      }));
    }
  }, [cities, deferredSearchQuery, filters.city]);

  useEffect(() => {
    if (filters.housingType === "all") return;
    setTrendMode(metricFromHousingType(filters.housingType));
  }, [filters.housingType]);

  const years = useMemo(
    () =>
      [...new Set(periods.map(period => period.year))]
        .sort((left, right) => left - right)
        .reverse(),
    [periods]
  );

  const selectedPeriod = useMemo(
    () => resolveSelectedPeriod(periods, filters.quarter, filters.year),
    [filters.quarter, filters.year, periods]
  );

  const latestPeriodLabel = periods[periods.length - 1]?.label ?? null;
  const selectedPeriodLabel = selectedPeriod?.label ?? latestPeriodLabel ?? "";
  const aggregateSeries = useMemo(() => buildAggregateSeries(records, "All Cities Average"), [records]);
  const citySeriesMap = useMemo(() => {
    const map = new Map<string, ResidexRecord[]>();

    for (const city of cities) {
      map.set(
        city,
        [...records]
          .filter(record => record.city === city)
          .sort((left, right) => compareResidexPeriods(left.quarter, right.quarter))
      );
    }

    return map;
  }, [cities, records]);

  const selectedCitySeries = filters.city === "All" ? aggregateSeries : citySeriesMap.get(filters.city) ?? aggregateSeries;
  const selectedCityRecord =
    selectedCitySeries.find(record => record.quarter === selectedPeriodLabel) ?? selectedCitySeries[selectedCitySeries.length - 1];
  const currentPeriodRows = useMemo(
    () =>
      records.filter(record => record.quarter === selectedPeriodLabel).sort((left, right) => right.residex - left.residex),
    [records, selectedPeriodLabel]
  );

  const filteredCities = useMemo(() => {
    if (!deferredSearchQuery.trim()) {
      return cities;
    }

    const query = deferredSearchQuery.toLowerCase();
    return cities.filter(city => city.toLowerCase().includes(query));
  }, [cities, deferredSearchQuery]);

  const summaryCards = useMemo(() => {
    if (!selectedCityRecord || !selectedPeriodLabel) return [];

    const nationalRecord =
      aggregateSeries.find(record => record.quarter === selectedPeriodLabel) ?? aggregateSeries[aggregateSeries.length - 1];
    const cityOverall = getSeriesMetricChange(selectedCitySeries, "overall", selectedPeriodLabel);
    const cityAffordable = getSeriesMetricChange(selectedCitySeries, "affordable", selectedPeriodLabel);
    const cityPremium = getSeriesMetricChange(selectedCitySeries, "premium", selectedPeriodLabel);
    const nationalChange = getSeriesMetricChange(aggregateSeries, "overall", selectedPeriodLabel);

    return [
      {
        id: "national",
        title: "National RESIDEX",
        subtitle: selectedPeriodLabel,
        value: nationalRecord.national,
        qoq: nationalChange.qoq,
        yoy: nationalChange.yoy,
        sparkline: buildSparkline(aggregateSeries, "overall"),
        tone: getTone(nationalChange.qoq)
      },
      {
        id: "city",
        title: "City-wise RESIDEX",
        subtitle: filters.city === "All" ? "All Cities Average" : filters.city,
        value: selectedCityRecord.residex,
        qoq: cityOverall.qoq,
        yoy: cityOverall.yoy,
        sparkline: buildSparkline(selectedCitySeries, "overall"),
        tone: getTone(cityOverall.qoq)
      },
      {
        id: "affordable",
        title: "Affordable Housing Index",
        subtitle: filters.city === "All" ? "National basket" : `${filters.city} basket`,
        value: selectedCityRecord.affordable,
        qoq: cityAffordable.qoq,
        yoy: cityAffordable.yoy,
        sparkline: buildSparkline(selectedCitySeries, "affordable"),
        tone: getTone(cityAffordable.qoq)
      },
      {
        id: "premium",
        title: "Premium Housing Index",
        subtitle: filters.city === "All" ? "National basket" : `${filters.city} basket`,
        value: selectedCityRecord.premium,
        qoq: cityPremium.qoq,
        yoy: cityPremium.yoy,
        sparkline: buildSparkline(selectedCitySeries, "premium"),
        tone: getTone(cityPremium.qoq)
      }
    ] satisfies ResidexCardMetric[];
  }, [aggregateSeries, filters.city, selectedCityRecord, selectedCitySeries, selectedPeriodLabel]);

  const nationalTrend = useMemo(
    () =>
      aggregateSeries.map(record => ({
        quarter: record.quarter,
        label: formatResidexShortPeriod(record.quarter),
        overall: record.residex,
        affordable: record.affordable,
        premium: record.premium,
        selected: record.quarter === selectedPeriodLabel
      })),
    [aggregateSeries, selectedPeriodLabel]
  );

  const comparisonMetric = filters.housingType === "all" ? trendMode : metricFromHousingType(filters.housingType);
  const sortedComparisonRows = useMemo(() => {
    const cityRows = currentPeriodRows.map(record => {
      const series = citySeriesMap.get(record.city) ?? [];
      const metricChange = getSeriesMetricChange(series, comparisonMetric, selectedPeriodLabel);

      return {
        ...record,
        value: getMetricValue(record, comparisonMetric),
        qoq: metricChange.qoq,
        yoy: metricChange.yoy,
        selected: record.city === filters.city
      };
    });

    return [...cityRows].sort((left, right) => {
      if (comparisonSort === "qoq") return right.qoq - left.qoq;
      if (comparisonSort === "yoy") return right.yoy - left.yoy;
      return right.value - left.value;
    });
  }, [citySeriesMap, comparisonMetric, comparisonSort, currentPeriodRows, filters.city, selectedPeriodLabel]);

  const comparisonRows = sortedComparisonRows;

  const selectedCityTrend = useMemo(
    () =>
      selectedCitySeries.map(record => ({
        quarter: record.quarter,
        label: formatResidexShortPeriod(record.quarter),
        affordable: record.affordable,
        premium: record.premium,
        overall: record.residex,
        selected: record.quarter === selectedPeriodLabel
      })),
    [selectedCitySeries, selectedPeriodLabel]
  );

  const heatmapPeriods = useMemo(() => {
    if (filters.year !== "Latest") {
      return periods.filter(period => period.year === filters.year);
    }

    if (filters.quarter !== "Latest") {
      return periods.filter(period => period.quarterCode === filters.quarter);
    }

    return periods.slice(-8);
  }, [filters.quarter, filters.year, periods]);

  const heatmapRows = useMemo(() => {
    const focusCities =
      filters.city === "All"
        ? sortedComparisonRows.map(row => row.city)
        : [filters.city];

    return focusCities
      .map(city => {
        const series = citySeriesMap.get(city) ?? [];

        return {
          city,
          values: heatmapPeriods.map(period => {
            const currentIndex = series.findIndex(record => record.quarter === period.label);
            const currentRecord = currentIndex >= 0 ? series[currentIndex] : null;
            const previousRecord = currentIndex > 0 ? series[currentIndex - 1] : null;
            const currentValue = currentRecord ? getMetricValue(currentRecord, comparisonMetric) : 0;
            const previousValue = previousRecord ? getMetricValue(previousRecord, comparisonMetric) : 0;

            return {
              quarter: period.label,
              value: previousRecord ? percentChange(currentValue, previousValue) : 0
            };
          })
        } satisfies ResidexHeatmapRow;
      })
      .filter(row => row.values.length > 0);
  }, [citySeriesMap, comparisonMetric, filters.city, heatmapPeriods, sortedComparisonRows]);

  const premiumHighlights = useMemo(() => {
    const currentRows = [...currentPeriodRows];
    const premiumLeader = currentRows.sort((left, right) => right.premium - left.premium)[0];
    const spreadLeader = [...currentRows].sort(
      (left, right) => right.premium - right.affordable - (left.premium - left.affordable)
    )[0];
    const growthLeader = [...currentRows]
      .map(row => ({
        city: row.city,
        change: getSeriesMetricChange(citySeriesMap.get(row.city) ?? [], "premium", selectedPeriodLabel).qoq
      }))
      .sort((left, right) => right.change - left.change)[0];
    const selectedGap = selectedCityRecord ? round(selectedCityRecord.premium - selectedCityRecord.affordable) : 0;

    return [
      {
        title: "Premium Leader",
        value: premiumLeader?.city ?? "--",
        detail: premiumLeader ? `${formatResidexValue(premiumLeader.premium)} current index` : "No city data",
        tone: "accent"
      },
      {
        title: "Fastest QoQ Premium Rise",
        value: growthLeader?.city ?? "--",
        detail: growthLeader ? `${growthLeader.change.toFixed(1)}% QoQ` : "No growth data",
        tone: "positive"
      },
      {
        title: "Widest Premium Gap",
        value: spreadLeader?.city ?? "--",
        detail: spreadLeader
          ? `${formatResidexValue(spreadLeader.premium - spreadLeader.affordable)} point spread`
          : "No spread data",
        tone: "warning"
      },
      {
        title: "Selected City Spread",
        value: formatResidexValue(selectedGap),
        detail: `${filters.city === "All" ? "All Cities Average" : filters.city} premium minus affordable`,
        tone: "neutral"
      }
    ] satisfies ResidexHighlightCard[];
  }, [citySeriesMap, currentPeriodRows, filters.city, selectedCityRecord, selectedPeriodLabel]);

  const tableRows = useMemo(
    () =>
      [...filterTableRows(records, filters, latestPeriodLabel)].sort((left, right) => {
        const periodComparison = compareResidexPeriods(right.quarter, left.quarter);
        if (periodComparison !== 0) return periodComparison;
        return left.city.localeCompare(right.city);
      }),
    [filters, latestPeriodLabel, records]
  );

  const mapCityPoints = useMemo(
    () =>
      currentPeriodRows.map(record => ({
        city: record.city,
        quarter: record.quarter,
        residex: record.residex,
        qoq: record.qoq,
        yoy: record.yoy
      })),
    [currentPeriodRows]
  );

  const value: ResidexContextValue = {
    loading,
    error,
    filters,
    activeTab,
    trendMode,
    comparisonSort,
    cities,
    filteredCities,
    years,
    periods,
    selectedPeriod,
    selectedPeriodLabel,
    selectedCityLabel: filters.city === "All" ? "All Cities Average" : filters.city,
    trendLabel: TAB_LABELS[activeTab],
    summaryCards,
    nationalTrend,
    comparisonRows,
    selectedCityTrend,
    heatmapColumns: heatmapPeriods.map(period => period.label),
    heatmapRows,
    premiumHighlights,
    currentPeriodRows,
    mapCityPoints,
    tableRows,
    headerStats,
    refreshKey,
    setCity: city =>
      setFilters(current => ({
        ...current,
        city
      })),
    setQuarter: quarter =>
      setFilters(current => ({
        ...current,
        quarter
      })),
    setYear: year =>
      setFilters(current => ({
        ...current,
        year
      })),
    setHousingType: housingType =>
      setFilters(current => ({
        ...current,
        housingType
      })),
    setSearchQuery: searchQuery =>
      setFilters(current => ({
        ...current,
        searchQuery
      })),
    setActiveTab,
    setTrendMode,
    setComparisonSort,
    clearFilters: () => {
      setFilters(DEFAULT_FILTERS);
      setTrendMode("overall");
      setComparisonSort("index");
      setActiveTab("overview");
    },
    refresh: async () => {
      setFilters(DEFAULT_FILTERS);
      setTrendMode("overall");
      setComparisonSort("index");
      setActiveTab("overview");
      setRefreshKey(current => current + 1);
      await loadResidex();
    }
  };

  return <ResidexContext.Provider value={value}>{children}</ResidexContext.Provider>;
}

export function useResidexContext() {
  const context = useContext(ResidexContext);

  if (!context) {
    throw new Error("useResidexContext must be used within a ResidexProvider.");
  }

  return context;
}
