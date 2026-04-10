import residexFullCitySeeds from "../data/residex_full.json";

export type ResidexQuarter = "Q1" | "Q2" | "Q3" | "Q4";
export type ResidexHousingType = "all" | "affordable" | "premium" | "overall";

export interface ResidexPeriod {
  label: string;
  quarterCode: ResidexQuarter;
  year: number;
}

export interface ResidexRecord {
  city: string;
  quarter: string;
  quarterCode: ResidexQuarter;
  year: number;
  national: number;
  residex: number;
  affordable: number;
  premium: number;
  qoq: number;
  yoy: number;
}

interface CitySeed {
  city: string;
  base: number;
  drift: number;
  seasonal: [number, number, number, number];
  affordableSpread: number;
  premiumSpread: number;
  volatility: number;
}

const CITY_SEEDS = residexFullCitySeeds as CitySeed[];

function round(value: number) {
  return Number(value.toFixed(1));
}

function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return round(((current - previous) / previous) * 100);
}

function buildPeriods(): ResidexPeriod[] {
  const periods: ResidexPeriod[] = [];

  for (let year = 2023; year <= 2026; year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      if (year === 2026 && quarter > 1) {
        break;
      }

      periods.push({
        label: `Q${quarter}-${year}`,
        quarterCode: `Q${quarter}` as ResidexQuarter,
        year
      });
    }
  }

  return periods;
}

export const RESIDEX_PERIODS = buildPeriods();

export function compareResidexPeriods(left: string, right: string) {
  const leftIndex = RESIDEX_PERIODS.findIndex(period => period.label === left);
  const rightIndex = RESIDEX_PERIODS.findIndex(period => period.label === right);
  return leftIndex - rightIndex;
}

function buildMockResidexData() {
  const citySeries = CITY_SEEDS.flatMap(seed =>
    RESIDEX_PERIODS.map((period, index) => {
      const quarterIndex = Number(period.quarterCode.replace("Q", "")) - 1;
      const cycle = seed.seasonal[quarterIndex];
      const yearLift = (period.year - 2023) * (0.8 + seed.volatility * 0.15);
      const momentum = Math.sin(index * 0.72 + seed.volatility) * seed.volatility;
      const residex = round(seed.base + seed.drift * index + cycle + yearLift + momentum);
      const affordable = round(residex - seed.affordableSpread + Math.cos(index * 0.48 + seed.volatility) * 1.1);
      const premium = round(residex + seed.premiumSpread + Math.sin(index * 0.55 + seed.volatility) * 1.4);

      return {
        city: seed.city,
        quarter: period.label,
        quarterCode: period.quarterCode,
        year: period.year,
        national: 0,
        residex,
        affordable,
        premium,
        qoq: 0,
        yoy: 0
      } satisfies ResidexRecord;
    })
  );

  const nationalByQuarter = new Map<string, number>();

  for (const period of RESIDEX_PERIODS) {
    const periodRows = citySeries.filter(record => record.quarter === period.label);
    const average = periodRows.reduce((sum, record) => sum + record.residex, 0) / periodRows.length;
    nationalByQuarter.set(period.label, round(average));
  }

  const records = citySeries.map(record => ({
    ...record,
    national: nationalByQuarter.get(record.quarter) ?? record.residex
  }));

  return CITY_SEEDS.flatMap(seed => {
    const series = records.filter(record => record.city === seed.city);

    return series.map((record, index) => ({
      ...record,
      qoq: index > 0 ? percentChange(record.residex, series[index - 1].residex) : 0,
      yoy: index > 3 ? percentChange(record.residex, series[index - 4].residex) : 0
    }));
  });
}

const MOCK_RESIDEX_DATA = buildMockResidexData();

function buildAggregateSeries(records: ResidexRecord[], label: string) {
  const aggregates: ResidexRecord[] = [];

  return RESIDEX_PERIODS.map((period, index) => {
    const periodRows = records.filter(record => record.quarter === period.label);
    const aggregate: ResidexRecord = {
      city: label,
      quarter: period.label,
      quarterCode: period.quarterCode,
      year: period.year,
      national: round(periodRows.reduce((sum, record) => sum + record.national, 0) / periodRows.length),
      residex: round(periodRows.reduce((sum, record) => sum + record.residex, 0) / periodRows.length),
      affordable: round(periodRows.reduce((sum, record) => sum + record.affordable, 0) / periodRows.length),
      premium: round(periodRows.reduce((sum, record) => sum + record.premium, 0) / periodRows.length),
      qoq: 0,
      yoy: 0
    };

    const previous = index > 0 ? aggregates[index - 1] : null;
    const yearAgo = index > 3 ? aggregates[index - 4] : null;

    aggregate.qoq = previous ? percentChange(aggregate.residex, previous.residex) : 0;
    aggregate.yoy = yearAgo ? percentChange(aggregate.residex, yearAgo.residex) : 0;

    aggregates.push(aggregate);
    return aggregate;
  });
}

const NATIONAL_SERIES = buildAggregateSeries(MOCK_RESIDEX_DATA, "National Composite");

function getLatestPeriodLabel() {
  return RESIDEX_PERIODS[RESIDEX_PERIODS.length - 1]?.label ?? "Q1-2026";
}

function findRecord(records: ResidexRecord[], quarter = getLatestPeriodLabel()) {
  return records.find(record => record.quarter === quarter) ?? records[records.length - 1];
}

export async function getResidexDataset() {
  return Promise.resolve(MOCK_RESIDEX_DATA);
}

export async function getResidexCities() {
  return Promise.resolve(CITY_SEEDS.map(seed => seed.city));
}

export async function getResidexPeriods() {
  return Promise.resolve(RESIDEX_PERIODS);
}

export async function getNationalResidex(quarter = getLatestPeriodLabel()) {
  return Promise.resolve(findRecord(NATIONAL_SERIES, quarter));
}

export async function getCityResidex(city: string) {
  const records = MOCK_RESIDEX_DATA.filter(record => record.city === city);
  return Promise.resolve(findRecord(records));
}

export async function getQuarterResidex(city: string, quarter: string) {
  const record = MOCK_RESIDEX_DATA.find(item => item.city === city && item.quarter === quarter) ?? null;
  return Promise.resolve(record);
}

export async function getAffordableIndex(quarter = getLatestPeriodLabel()) {
  return Promise.resolve(findRecord(NATIONAL_SERIES, quarter));
}

export async function getPremiumIndex(quarter = getLatestPeriodLabel()) {
  return Promise.resolve(findRecord(NATIONAL_SERIES, quarter));
}
