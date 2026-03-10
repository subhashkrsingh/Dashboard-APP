import { useEffect, useRef, useState } from "react";

import { toShortTime } from "../lib/formatters";
import type { PowerSectorResponse, PriceDirection, TimePoint } from "../types/market";

const MAX_POINTS = 120;

export interface CompanyHistoryPoint {
  time: string;
  isoTime: string;
  price: number;
}

type SignalMap = Record<string, PriceDirection>;
type CompanyHistoryMap = Record<string, CompanyHistoryPoint[]>;

function getDirection(previous: number | null | undefined, current: number | null | undefined): PriceDirection {
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return "flat";
  if (Number(current) > Number(previous)) return "up";
  if (Number(current) < Number(previous)) return "down";
  return "flat";
}

export function useMarketHistory(snapshot: PowerSectorResponse | undefined) {
  const [sectorHistory, setSectorHistory] = useState<TimePoint[]>([]);
  const [companyHistory, setCompanyHistory] = useState<CompanyHistoryMap>({});
  const [signals, setSignals] = useState<SignalMap>({});
  const previousPricesRef = useRef<Record<string, number | null>>({});
  const clearSignalsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!snapshot?.fetchedAt) return;

    const isoTime = snapshot.fetchedAt;
    const time = toShortTime(isoTime);
    const nextSignals: SignalMap = {};

    if (Number.isFinite(snapshot.sectorIndex.lastPrice)) {
      setSectorHistory(previous => {
        const price = Number(snapshot.sectorIndex.lastPrice);
        const next = [...previous];
        const last = next[next.length - 1];

        if (last?.isoTime === isoTime) {
          next[next.length - 1] = { ...last, sectorPrice: price };
        } else {
          next.push({ time, isoTime, sectorPrice: price });
        }

        return next.slice(-MAX_POINTS);
      });
    }

    setCompanyHistory(previous => {
      const next: CompanyHistoryMap = { ...previous };

      snapshot.companies.forEach(company => {
        if (!Number.isFinite(company.price)) return;
        const price = Number(company.price);
        const symbol = company.symbol;
        const currentSeries = next[symbol] ? [...next[symbol]] : [];

        if (currentSeries[currentSeries.length - 1]?.isoTime === isoTime) {
          currentSeries[currentSeries.length - 1] = {
            ...currentSeries[currentSeries.length - 1],
            price
          };
        } else {
          currentSeries.push({ time, isoTime, price });
        }

        next[symbol] = currentSeries.slice(-MAX_POINTS);
      });

      return next;
    });

    const prevSectorPrice = previousPricesRef.current.__sector ?? null;
    const currentSectorPrice = snapshot.sectorIndex.lastPrice;
    const sectorDirection = getDirection(prevSectorPrice, currentSectorPrice);
    if (sectorDirection !== "flat") {
      nextSignals.__sector = sectorDirection;
    }

    snapshot.companies.forEach(company => {
      const previousPrice = previousPricesRef.current[company.symbol];
      const direction = getDirection(previousPrice, company.price);
      if (direction !== "flat") {
        nextSignals[company.symbol] = direction;
      }

      previousPricesRef.current[company.symbol] = Number.isFinite(company.price)
        ? Number(company.price)
        : null;
    });
    previousPricesRef.current.__sector = Number.isFinite(snapshot.sectorIndex.lastPrice)
      ? Number(snapshot.sectorIndex.lastPrice)
      : null;

    if (Object.keys(nextSignals).length > 0) {
      setSignals(nextSignals);
      if (clearSignalsTimeoutRef.current) {
        window.clearTimeout(clearSignalsTimeoutRef.current);
      }
      clearSignalsTimeoutRef.current = window.setTimeout(() => {
        setSignals({});
      }, 1600);
    }

  }, [snapshot?.fetchedAt]);

  useEffect(() => {
    return () => {
      if (clearSignalsTimeoutRef.current) {
        window.clearTimeout(clearSignalsTimeoutRef.current);
      }
    };
  }, []);

  return {
    sectorHistory,
    companyHistory,
    signals
  };
}
