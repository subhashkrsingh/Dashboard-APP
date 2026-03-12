import axios from "axios";

import type { PowerSectorResponse } from "../types/market";
import { API_BASE_URL, normalizeSectorResponse } from "./sectorApi";

export async function fetchPowerSectorData(): Promise<PowerSectorResponse> {
  const response = await axios.get(`${API_BASE_URL}/power-sector`, {
    timeout: 20000
  });

  return normalizeSectorResponse(response.data, {
    defaultIndexName: "NIFTY POWER",
    sourceLabel: "power sector"
  });
}
