import type { SectorSnapshot } from "../types/market";

function normalizeText(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function getSectorLabel(snapshot: SectorSnapshot | undefined) {
  return snapshot?.sectorIndex.name?.trim() || snapshot?.requestedIndex?.trim() || "Sector";
}

export function isRefreshFailureSnapshot(snapshot: SectorSnapshot | undefined) {
  if (!snapshot || snapshot.dataStatus !== "cache" || !snapshot.lastRefreshError) {
    return false;
  }

  if (snapshot.lastRefreshError.code === "REFRESH_FAILED") {
    return true;
  }

  const errorMessage = normalizeText(snapshot.lastRefreshError.message);
  const bannerMessage = normalizeText(snapshot.message);
  const warningMessage = normalizeText(snapshot.warning);

  return [errorMessage, bannerMessage, warningMessage].some(message => {
    return message.includes("refresh failed") || message.includes("refresh timed out") || message.includes("timed out");
  });
}

export function getCacheAlertMessage(snapshot: SectorSnapshot | undefined) {
  if (isRefreshFailureSnapshot(snapshot)) {
    return `${getSectorLabel(snapshot)} refresh timed out - showing cached data`;
  }

  return "Using cached snapshot";
}

export function shouldShowInlineCacheBanner(snapshot: SectorSnapshot | undefined) {
  return snapshot?.dataStatus === "cache" && !isRefreshFailureSnapshot(snapshot);
}
