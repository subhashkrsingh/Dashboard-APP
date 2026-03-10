import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export async function fetchPowerSectorSnapshot() {
  const response = await axios.get(`${API_BASE_URL}/power-sector`, {
    timeout: 15000
  });

  if (!response?.data || typeof response.data !== "object") {
    throw new Error("Empty response from power sector API");
  }

  return response.data;
}
