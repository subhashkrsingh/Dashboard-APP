import axios from "axios";

import type { CompanyQuote, RealEstateSectorResponse } from "../types/market";
import { API_BASE_URL, normalizeSectorResponse } from "./sectorApi";

const FALLBACK_REAL_ESTATE_QUOTES: CompanyQuote[] = [
  {
    symbol: "DLF",
    name: "DLF",
    price: 852.35,
    change: 17.95,
    percentChange: 2.15,
    volume: 4_540_000
  },
  {
    symbol: "GODREJPROP",
    name: "Godrej Properties",
    price: 3159.7,
    change: 41.25,
    percentChange: 1.32,
    volume: 1_420_000
  },
  {
    symbol: "OBEROIRLTY",
    name: "Oberoi Realty",
    price: 1975.8,
    change: -11.6,
    percentChange: -0.58,
    volume: 780_000
  },
  {
    symbol: "PRESTIGE",
    name: "Prestige Estates",
    price: 1598.4,
    change: 29.45,
    percentChange: 1.88,
    volume: 1_150_000
  },
  {
    symbol: "PHOENIXLTD",
    name: "Phoenix Mills",
    price: 3339.2,
    change: -26.85,
    percentChange: -0.8,
    volume: 620_000
  }
];

function sortByPercentDesc(left: CompanyQuote, right: CompanyQuote) {
  return (right.percentChange ?? Number.NEGATIVE_INFINITY) - (left.percentChange ?? Number.NEGATIVE_INFINITY);
}

function sortByPercentAsc(left: CompanyQuote, right: CompanyQuote) {
  return (left.percentChange ?? Number.POSITIVE_INFINITY) - (right.percentChange ?? Number.POSITIVE_INFINITY);
}

function getFallbackMarketStatus() {
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = istNow.getDay();
  const isWeekday = day >= 1 && day <= 5;
  const minutes = istNow.getHours() * 60 + istNow.getMinutes();
  const openMinutes = 9 * 60 + 15;
  const closeMinutes = 15 * 60 + 30;
  const isOpen = isWeekday && minutes >= openMinutes && minutes <= closeMinutes;

  return {
    isOpen,
    label: isOpen ? "OPEN" : "CLOSED",
    timezone: "Asia/Kolkata",
    checkedAt: now.toISOString()
  };
}

function normalizeRealEstateSnapshot(snapshot: RealEstateSectorResponse): RealEstateSectorResponse {
  const companies = snapshot.companies;
  const ranked = [...companies].filter(company => Number.isFinite(company.percentChange));

  return {
    ...snapshot,
    companies,
    gainers: [...ranked].sort(sortByPercentDesc).slice(0, 5),
    losers: [...ranked].sort(sortByPercentAsc).slice(0, 5),
    advanceDecline: snapshot.advanceDecline ?? {
      advances: companies.filter(company => (company.percentChange ?? 0) > 0).length,
      declines: companies.filter(company => (company.percentChange ?? 0) < 0).length,
      unchanged: companies.filter(company => (company.percentChange ?? 0) === 0).length
    }
  };
}

function buildFallbackResponse(): RealEstateSectorResponse {
  const ranked = [...FALLBACK_REAL_ESTATE_QUOTES].sort(sortByPercentDesc);
  const sectorSpot =
    FALLBACK_REAL_ESTATE_QUOTES.reduce((sum, stock) => sum + (stock.price ?? 0), 0) /
    Math.max(FALLBACK_REAL_ESTATE_QUOTES.length, 1);

  return {
    sectorIndex: {
      name: "NIFTY REALTY",
      lastPrice: Number(sectorSpot.toFixed(2)),
      change: 28.75,
      percentChange: 0.96,
      previousClose: Number((sectorSpot - 28.75).toFixed(2)),
      tradedVolume: FALLBACK_REAL_ESTATE_QUOTES.reduce((sum, company) => sum + (company.volume ?? 0), 0)
    },
    companies: FALLBACK_REAL_ESTATE_QUOTES,
    gainers: ranked.slice(0, 5),
    losers: [...ranked].sort(sortByPercentAsc).slice(0, 5),
    marketStatus: getFallbackMarketStatus(),
    advanceDecline: {
      advances: FALLBACK_REAL_ESTATE_QUOTES.filter(company => (company.percentChange ?? 0) > 0).length,
      declines: FALLBACK_REAL_ESTATE_QUOTES.filter(company => (company.percentChange ?? 0) < 0).length,
      unchanged: FALLBACK_REAL_ESTATE_QUOTES.filter(company => (company.percentChange ?? 0) === 0).length
    },
    requestedIndex: "NIFTY REALTY",
    fetchedAt: new Date().toISOString(),
    stale: true,
    warning: "Live real estate feed unavailable from API. Showing fallback market snapshot.",
    cached: true
  };
}

export async function fetchRealEstateSectorData(): Promise<RealEstateSectorResponse> {
  try {
    const response = await axios.get(`${API_BASE_URL}/real-estate-sector`, {
      timeout: 20000
    });

    const normalized = normalizeSectorResponse(response.data, {
      defaultIndexName: "NIFTY REALTY",
      sourceLabel: "real estate sector"
    });

    return normalizeRealEstateSnapshot(normalized);
  } catch {
    return buildFallbackResponse();
  }
}
