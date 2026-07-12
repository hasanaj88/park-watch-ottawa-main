// src/services/trafficDataProvider.ts

import { fetchCameras, fetchEvents } from "./trafficApi";
import { fetchParkingLots } from "./parkingApi";
import { USE_API } from "@/config/dataMode";
import { MOCK_PARKING_LOTS } from "@/data/mockParkingLots";
import { MOCK_CAMERAS } from "@/data/mockCameras";
import { MOCK_EVENTS } from "@/data/mockEvents";

import type { Camera, TrafficEvent } from "@/lib/traffic/trafficSummary";
import type { ParkingLot } from "@/types/parking";

export type ParkingDataBundle = {
  lots: ParkingLot[];
  cameras: Camera[];
  events: TrafficEvent[];
  isCached?: boolean;
  cachedAt?: string | null;
};

const FULL_CACHE_KEY = "ottawa_parking_last_full_data";

function saveFullCache(data: ParkingDataBundle) {
  if (data.lots.length > 0) {
    localStorage.setItem(
      FULL_CACHE_KEY,
      JSON.stringify({
        ...data,
        isCached: false,
        cachedAt: new Date().toISOString(),
      })
    );
  }
}

function readFullCache(): ParkingDataBundle | null {
  try {
    const raw = localStorage.getItem(FULL_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ParkingDataBundle;

    if (!Array.isArray(parsed.lots) || parsed.lots.length === 0) {
      return null;
    }

    return {
      lots: parsed.lots,
      cameras: Array.isArray(parsed.cameras) ? parsed.cameras : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      isCached: true,
      cachedAt: parsed.cachedAt ?? null,
    };
  } catch {
    return null;
  }
}

function toTypedMockLots(): ParkingLot[] {
  return (MOCK_PARKING_LOTS as any[]).map((x) => ({
    lot: x,
    ...x,
  })) as ParkingLot[];
}

function getMockData(): ParkingDataBundle {
  return {
    lots: toTypedMockLots(),
    cameras: MOCK_CAMERAS as any,
    events: MOCK_EVENTS as any,
    isCached: false,
    cachedAt: null,
  };
}

export async function getAllParkingData(): Promise<ParkingDataBundle> {
  if (!USE_API) {
    return getMockData();
  }

  try {
    const [lots, cameras, events] = await Promise.all([
      fetchParkingLots(),
      fetchCameras(),
      fetchEvents(),
    ]);

    const liveData: ParkingDataBundle = {
      lots,
      cameras,
      events,
      isCached: false,
      cachedAt: null,
    };

    if (lots.length > 0) {
      saveFullCache(liveData);
      return liveData;
    }

    const cached = readFullCache();
    if (cached) return cached;

    return liveData;
  } catch (err) {
    console.warn("Live parking data failed. Trying cached data:", err);

    const cached = readFullCache();
    if (cached) return cached;

    return {
  lots: [],
  cameras: [],
  events: [],
  isCached: true,
  cachedAt: null,
};
  }
}

export { getAllParkingData as getTrafficData };