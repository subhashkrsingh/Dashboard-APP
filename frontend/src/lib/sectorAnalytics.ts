import type { CompanyQuote, SectorSnapshot } from "../types/market";

export interface SectorAnalytics {
  topGainer?: CompanyQuote;
  topLoser?: CompanyQuote;
  volumeLeader?: CompanyQuote;
  totalVolume: number;
  averageChange: number;
  advances: number;
  declines: number;
}

function getTopByPercent(companies: CompanyQuote[], direction: "max" | "min") {
  const sorted = [...companies].sort((left, right) => {
    const leftValue = Number.isFinite(left.percentChange) ? Number(left.percentChange) : 0;
    const rightValue = Number.isFinite(right.percentChange) ? Number(right.percentChange) : 0;
    return direction === "max" ? rightValue - leftValue : leftValue - rightValue;
  });

  return sorted[0];
}

export function deriveSectorAnalytics(data: SectorSnapshot): SectorAnalytics {
  const topGainer = data.gainers[0] ?? getTopByPercent(data.companies, "max");
  const topLoser = data.losers[0] ?? getTopByPercent(data.companies, "min");
  const volumeLeader = [...data.companies].sort((left, right) => (right.volume ?? 0) - (left.volume ?? 0))[0];
  const totalVolume = data.companies.reduce((sum, company) => sum + (company.volume ?? 0), 0);
  const averageChange = data.companies.length
    ? data.companies.reduce((sum, company) => sum + (company.percentChange ?? 0), 0) / data.companies.length
    : 0;
  const advances =
    data.advanceDecline?.advances ?? data.companies.filter(company => (company.percentChange ?? 0) > 0).length;
  const declines =
    data.advanceDecline?.declines ?? data.companies.filter(company => (company.percentChange ?? 0) < 0).length;

  return {
    topGainer,
    topLoser,
    volumeLeader,
    totalVolume,
    averageChange,
    advances,
    declines
  };
}
