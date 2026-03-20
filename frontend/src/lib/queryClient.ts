import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

const DEFAULT_STALE_TIME_MS = 60_000;
const DEFAULT_GC_TIME_MS = 30 * 60_000;
const MAX_RETRIES = 4;

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const NON_RETRYABLE_HTTP_STATUSES = new Set([400, 401, 403, 404, 422]);

function getErrorStatusCode(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }

  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = Number((error as { statusCode?: unknown }).statusCode);
    return Number.isFinite(statusCode) ? statusCode : undefined;
  }

  return undefined;
}

function isNetworkFailure(error: unknown) {
  if (axios.isAxiosError(error)) {
    return !error.response || error.code === "ECONNABORTED";
  }

  if (typeof error === "object" && error !== null && "isNetworkError" in error) {
    return Boolean((error as { isNetworkError?: unknown }).isNetworkError);
  }

  return false;
}

function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= MAX_RETRIES) {
    return false;
  }

  // Network errors and timeouts are common during cold starts.
  if (isNetworkFailure(error)) {
    return true;
  }

  const status = getErrorStatusCode(error);
  if (!status) {
    return true;
  }

  if (NON_RETRYABLE_HTTP_STATUSES.has(status)) {
    return false;
  }

  if (RETRYABLE_HTTP_STATUSES.has(status)) {
    return true;
  }

  return true;
}

function getRetryDelay(attempt: number) {
  // Exponential backoff with a cap to protect backend and UX.
  return Math.min(1000 * 2 ** attempt, 15_000);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep market data fresh for one minute without triggering frequent refetches.
      staleTime: DEFAULT_STALE_TIME_MS,
      // Retain cache for quick tab/page switches and route changes.
      gcTime: DEFAULT_GC_TIME_MS,
      // Avoid surprise request bursts during tab focus transitions.
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // Reconnect can recover naturally after temporary network drops.
      refetchOnReconnect: true,
      retry: shouldRetryQuery,
      retryDelay: getRetryDelay
    }
  }
});
