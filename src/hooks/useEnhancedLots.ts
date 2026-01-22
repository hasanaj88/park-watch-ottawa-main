import { useEffect, useMemo, useState } from "react";
import type { ParkingLot } from "@/types/parking";
import { getLotCounts, hasLotCounts } from "@/utils/parking";

type Weather = { temp: number; rain: boolean; snow: boolean };

// VITE_API_BASE_URL in .env
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString() || "http://localhost:3001";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getTimeCongestionScore(date = new Date()): number {
  const day = date.getDay(); // 0=Sun..6=Sat
  const hour = date.getHours();

  let score = 40;

  if (hour >= 7 && hour <= 9) score += 25;      // Morning peak
  if (hour >= 15 && hour <= 18) score += 30;    // Afternoon peak

  if (day >= 1 && day <= 4) score += 10;        // Mon–Thu
  if (day === 0 || day === 6) score -= 10;      // Weekend

  if (hour >= 22 || hour <= 5) score -= 15;     // Late night

  return clamp(score, 0, 100);
}

function getWeatherDelta(w: Weather): number {
  let delta = 0;
  if (w.rain) delta += 10;
  if (w.snow) delta += 20;
  if (w.temp < -10) delta += 15;
  return delta;
}

function isApiLot(lot: any) {
  // rule: do NOT touch API lots
  const mode = String(lot?.map_data_mode ?? lot?.data_mode ?? "").toLowerCase();
  return mode === "api";
}

export function useEnhancedLots(lots: ParkingLot[]) {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadWeather = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/weather`, {
          signal: controller.signal,
        });
        if (!res.ok) return;

        const data = (await res.json()) as Weather;
        setWeather(data);
      } catch {
        // fallback to time-only
      }
    };

    
    loadWeather();

    // Update weather every 10 minutes
    const interval = window.setInterval(loadWeather, 10 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const enhancedLots = useMemo(() => {
    if (!lots?.length) return lots;

    const baseCongestion = getTimeCongestionScore(new Date());
    const congestion = weather
      ? clamp(baseCongestion + getWeatherDelta(weather), 0, 100)
      : baseCongestion;

    return lots.map((lot: any) => {
      // 1) API: unchanged
      if (isApiLot(lot)) {
        return { ...lot, dataQuality: "API" as const };
      }

      //  2) If already has live counts: unchanged
      if (hasLotCounts(lot)) {
        return { ...lot, dataQuality: "LIVE" as const };
      }

      //  3) Virtual: compute estimated free/total
      const counts = getLotCounts(lot);
      const capacity = Number(counts.total ?? lot.capacity ?? lot.map_capacity ?? 0);

      if (!Number.isFinite(capacity) || capacity <= 0) {
        return { ...lot, dataQuality: "ESTIMATED" as const };
      }

      const maxDrop = Math.round(capacity * 0.35);
      const drop = Math.round((congestion / 100) * maxDrop);

      const baseFree =
        typeof counts.free === "number" && Number.isFinite(counts.free)
          ? counts.free
          : Math.round(capacity * 0.35);

      // [0..capacity]
      const currentFree = clamp(Math.round(baseFree), 0, capacity);
      const newFree = clamp(currentFree - drop, 0, capacity);

      return {
        ...lot,
        free: newFree,
        total: capacity,
        hasLiveData: true,
        dataQuality: "ESTIMATED" as const,
        congestionScore: congestion,
      };
    });
  }, [lots, weather]);

  return { enhancedLots, weather };
}
