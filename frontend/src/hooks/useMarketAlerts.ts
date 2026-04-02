import { useEffect, useMemo, useRef } from "react";

import type { CompanyQuote, SectorSnapshot } from "../types/market";
import { addAlert, pruneAlerts, useAlertStore } from "../stores/alertStore";

const ALERT_DEBOUNCE_MS = 250;
const PRUNE_INTERVAL_MS = 30_000;

function getTopLoser(companies: CompanyQuote[], providedLosers: CompanyQuote[]) {
  if (providedLosers.length > 0) {
    return providedLosers[0];
  }

  return [...companies].sort((a, b) => (a.percentChange ?? 0) - (b.percentChange ?? 0))[0];
}

function buildAlertCandidates(snapshot: SectorSnapshot | undefined) {
  if (!snapshot) {
    return [];
  }

  const candidates: Array<{ id: string; message: string; severity: "info" | "warning" | "danger" }> = [];
  const sectorPercentChange = snapshot.sectorIndex.percentChange;
  const sectorName = snapshot.sectorIndex.name || snapshot.requestedIndex || "Sector";
  const topLoser = getTopLoser(snapshot.companies, snapshot.losers);
  const averageVolume =
    snapshot.companies.length > 0
      ? snapshot.companies.reduce((sum, company) => sum + (company.volume ?? 0), 0) / snapshot.companies.length
      : 0;
  const volumeSpike =
    averageVolume > 0
      ? snapshot.companies
          .filter(company => Number.isFinite(company.volume) && (company.volume ?? 0) > averageVolume * 2)
          .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0]
      : undefined;

  if (snapshot.source === "cache" || snapshot.dataStatus === "cache") {
    candidates.push({
      id: "feed-fallback",
      message: "Using recent snapshot (live feed restricted)",
      severity: "warning"
    });
  }

  if (Number.isFinite(sectorPercentChange) && Number(sectorPercentChange) < -1.5) {
    candidates.push({
      id: `sector-drop:${sectorName}`,
      message: `${sectorName} down ${Number(sectorPercentChange).toFixed(2)}%`,
      severity: "danger"
    });
  }

  if (topLoser && Number.isFinite(topLoser.percentChange) && Number(topLoser.percentChange) < -3) {
    candidates.push({
      id: `top-loser:${topLoser.symbol}`,
      message: `${topLoser.symbol} heavy selloff ${Number(topLoser.percentChange).toFixed(2)}%`,
      severity: "danger"
    });
  }

  if (volumeSpike) {
    candidates.push({
      id: `volume-spike:${volumeSpike.symbol}`,
      message: `${volumeSpike.symbol} unusual volume spike`,
      severity: "info"
    });
  }

  return candidates;
}

export function useMarketAlerts(snapshot: SectorSnapshot | undefined) {
  const { alerts } = useAlertStore();
  const previousSignatureRef = useRef<string>("");
  const previousMarketOpenRef = useRef<boolean | null>(null);

  const alertCandidates = useMemo(() => buildAlertCandidates(snapshot), [snapshot]);

  useEffect(() => {
    pruneAlerts();
    const intervalId = window.setInterval(() => {
      pruneAlerts();
    }, PRUNE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (alertCandidates.length === 0) {
      previousSignatureRef.current = "";
      return;
    }

    const nextSignature = alertCandidates.map(candidate => `${candidate.id}:${candidate.message}`).join("|");
    if (nextSignature === previousSignatureRef.current) {
      return;
    }

    previousSignatureRef.current = nextSignature;
    const timeoutId = window.setTimeout(() => {
      alertCandidates.forEach(candidate => addAlert(candidate));
    }, ALERT_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [alertCandidates]);

  useEffect(() => {
    const isOpen = Boolean(snapshot?.marketStatus?.isOpen);
    const previousOpen = previousMarketOpenRef.current;
    previousMarketOpenRef.current = isOpen;

    if (!isOpen || previousOpen === true) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      addAlert({
        id: "market-open",
        message: "Market is now OPEN",
        severity: "info"
      });
    }, ALERT_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [snapshot?.marketStatus?.isOpen]);

  return {
    alerts,
    unreadCount: alerts.filter(alert => !alert.read).length
  };
}
