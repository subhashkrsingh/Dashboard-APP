import axios from "axios";

const DEFAULT_API_BASE_URL = "/api";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: "application/json"
  }
});

export interface ApiRequestError extends Error {
  statusCode?: number;
  errorCode?: string;
  path: string;
  resourceLabel: string;
  isNetworkError: boolean;
}

function getResponseErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if ("error" in payload) {
    const message = String(payload.error ?? "").trim();
    if (message) {
      return message;
    }
  }

  if ("message" in payload) {
    const message = String(payload.message ?? "").trim();
    if (message) {
      return message;
    }
  }

  return "";
}

function normalizeApiPath(path: string) {
  const normalized = String(path || "").trim();

  if (!normalized.startsWith("/")) {
    throw new Error(`Invalid API path "${normalized}". Path must start with "/".`);
  }

  if (normalized.includes("undefined") || normalized.includes("null")) {
    throw new Error(`Invalid API path "${normalized}".`);
  }

  return normalized;
}

export function toApiErrorMessage(error: unknown, resourceLabel: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage = getResponseErrorMessage(error.response?.data);
    if (responseMessage) {
      return responseMessage;
    }

    if (error.code === "ECONNABORTED") {
      return `${resourceLabel} request timed out.`;
    }

    if (error.response?.status === 404) {
      return `${resourceLabel} endpoint was not found.`;
    }

    if (error.response?.status) {
      return `${resourceLabel} request failed with status ${error.response.status}.`;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return `Unable to load ${resourceLabel.toLowerCase()}.`;
}

function toApiRequestError(error: unknown, path: string, resourceLabel: string): ApiRequestError {
  const apiError = new Error(toApiErrorMessage(error, resourceLabel)) as ApiRequestError;
  apiError.name = "ApiRequestError";
  apiError.path = path;
  apiError.resourceLabel = resourceLabel;
  apiError.statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
  apiError.errorCode = axios.isAxiosError(error) ? error.code : undefined;
  apiError.isNetworkError = axios.isAxiosError(error) && !error.response;
  return apiError;
}

export async function getApiResource<T>(path: string, resourceLabel: string) {
  const resolvedPath = normalizeApiPath(path);

  try {
    const response = await apiClient.get<T>(resolvedPath);
    return {
      data: response.data,
      cacheStatus: String(response.headers?.["x-cache"] ?? "").trim() || undefined
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
      console.error("[api-client] request failed", {
        path: resolvedPath,
        resourceLabel,
        statusCode: statusCode ?? null,
        message: toApiErrorMessage(error, resourceLabel)
      });
    }

    throw toApiRequestError(error, resolvedPath, resourceLabel);
  }
}
