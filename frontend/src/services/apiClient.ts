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

export async function getApiResource<T>(path: string, resourceLabel: string) {
  try {
    const response = await apiClient.get<T>(path);
    return {
      data: response.data,
      cacheStatus: String(response.headers?.["x-cache"] ?? "").trim() || undefined
    };
  } catch (error) {
    throw new Error(toApiErrorMessage(error, resourceLabel));
  }
}
