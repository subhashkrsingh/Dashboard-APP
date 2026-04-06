import type { CompanyQuote } from "../types/market";

type SearchableCompany = CompanyQuote & {
  category?: string | null;
  industry?: string | null;
  sector?: string | null;
  sectorName?: string | null;
  sectorTag?: string | null;
  sectorTags?: string[] | string | null;
  tags?: string[] | string | null;
};

function toTermList(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  const normalized = String(value ?? "").trim();
  return normalized ? [normalized] : [];
}

export function normalizeCompanySearchQuery(query: string) {
  return query.trim().toLowerCase();
}

export function matchesCompanySearch(company: CompanyQuote, normalizedQuery: string, fallbackTerms: string[] = []) {
  if (!normalizedQuery) {
    return true;
  }

  const searchableCompany = company as SearchableCompany;
  const searchableTerms = [
    company.symbol,
    company.name,
    searchableCompany.sectorTag,
    searchableCompany.sectorName,
    searchableCompany.sector,
    searchableCompany.industry,
    searchableCompany.category,
    ...toTermList(searchableCompany.tags),
    ...toTermList(searchableCompany.sectorTags),
    ...fallbackTerms
  ];

  return searchableTerms.some(term => term?.toLowerCase().includes(normalizedQuery));
}

export function filterCompaniesBySearch(companies: CompanyQuote[], query: string, fallbackTerms: string[] = []) {
  const normalizedQuery = normalizeCompanySearchQuery(query);

  if (!normalizedQuery) {
    return companies;
  }

  return companies.filter(company => matchesCompanySearch(company, normalizedQuery, fallbackTerms));
}
