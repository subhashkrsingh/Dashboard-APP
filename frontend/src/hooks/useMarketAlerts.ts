import { useMemo } from "react";

import { getCacheAlertMessage, isRefreshFailureSnapshot } from "../lib/cacheStatus";
import type { CompanyQuote, SectorSnapshot } from "../types/market";

export type MarketAlertSeverity = "info" | "warning" | "danger";

export interface MarketAlert {
  id: string;
  message: string;
  severity: MarketAlertSeverity;
  timestamp: number;
  read: boolean;
}

function toTimestamp(value: string | undefined) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function getTopLoser(companies: CompanyQuote[], losers: CompanyQuote[]) {
  if (losers.length > 0) {
    return losers[0];
  }

  return [...companies].sort((a, b) => (a.percentChange ?? 0) - (b.percentChange ?? 0))[0];
}

function getVolumeSpike(companies: CompanyQuote[]) {
  const companiesWithVolume = companies.filter(company => Number.isFinite(company.volume));
  if (companiesWithVolume.length === 0) {
    return null;
  }

  const averageVolume =
    companiesWithVolume.reduce((sum, company) => sum + Number(company.volume ?? 0), 0) / companiesWithVolume.length;

  if (!Number.isFinite(averageVolume) || averageVolume <= 0) {
    return null;
  }

  return (
    [...companiesWithVolume]
      .sort((a, b) => Number(b.volume ?? 0) - Number(a.volume ?? 0))
      .find(company => Number(company.volume ?? 0) > averageVolume * 2) || null
  );
}

export function useMarketAlerts(snapshot: SectorSnapshot | undefined) {
  const source = snapshot?.source ?? (snapshot?.dataStatus === "cache" ? "cache" : "live");
  const sectorChange = Number(snapshot?.sectorIndex.percentChange);
  const topLoser = useMemo(
    () => getTopLoser(snapshot?.companies ?? [], snapshot?.losers ?? []),
    [snapshot?.companies, snapshot?.losers]
  );
  const topLoserSymbol = topLoser?.symbol ?? "";
  const topLoserChange = Number(topLoser?.percentChange);
  const marketIsOpen = Boolean(snapshot?.marketStatus?.isOpen);
  const volumeSpike = useMemo(() => getVolumeSpike(snapshot?.companies ?? []), [snapshot?.companies]);
  const volumeSpikeSymbol = volumeSpike?.symbol ?? "";
  const baseTimestamp = toTimestamp(snapshot?.fetchedAt);

  const alerts = useMemo(() => {
    const list: MarketAlert[] = [];
    const seen = new Set<string>();

    const addAlert = (alert: Omit<MarketAlert, "timestamp" | "read">) => {
      if (seen.has(alert.id)) {
        return;
      }

      seen.add(alert.id);
      list.push({
        ...alert,
        timestamp: baseTimestamp,
        read: false
      });
    };

    if (source === "cache") {
      addAlert({
        id: isRefreshFailureSnapshot(snapshot) ? "refresh-failed" : "cache",
        message: getCacheAlertMessage(snapshot),
        severity: "warning"
      });
    }

    if (Number.isFinite(sectorChange) && sectorChange < -1.5) {
      addAlert({
        id: "sector-drop",
        message: `${snapshot?.sectorIndex.name ?? "Energy"} down ${sectorChange.toFixed(2)}%`,
        severity: "danger"
      });
    }

    if (topLoserSymbol && Number.isFinite(topLoserChange) && topLoserChange < -3) {
      addAlert({
        id: "top-loser",
        message: `${topLoserSymbol} heavy selloff ${topLoserChange.toFixed(2)}%`,
        severity: "danger"
      });
    }

    if (marketIsOpen) {
      addAlert({
        id: "market-open",
        message: "Market is now OPEN",
        severity: "info"
      });
    }

    if (volumeSpikeSymbol) {
      addAlert({
        id: "volume-spike",
        message: `${volumeSpikeSymbol} unusual volume spike`,
        severity: "info"
      });
    }

    return list;
  }, [baseTimestamp, marketIsOpen, sectorChange, snapshot?.sectorIndex.name, source, topLoserChange, topLoserSymbol, volumeSpikeSymbol]);

  return {
    alerts,
    alertCount: alerts.length
  };
}
