// src/services/trafficDataProvider.ts

import { fetchCameras, fetchEvents } from "./trafficApi";
import { fetchParkingLots } from "./parkingApi";
import { USE_API } from "@/config/dataMode";
import { MOCK_PARKING_LOTS } from "@/data/mockParkingLots";
import { MOCK_CAMERAS } from "@/data/mockCameras";
import { MOCK_EVENTS } from "@/data/mockEvents";

import type {
  Camera,
  TrafficEvent,
} from "@/lib/traffic/trafficSummary";
import type { ParkingLot } from "@/types/parking";

export type ParkingDataBundle = {
  lots: ParkingLot[];
  cameras: Camera[];
  events: TrafficEvent[];
  isCached?: boolean;
  cachedAt?: string | null;
};

const FULL_CACHE_KEY = "ottawa_parking_last_full_data";

/**
 * Save successful parking data locally.
 *
 * Safari may block localStorage in some privacy modes.
 * Cache failures must never prevent live data from being displayed.
 */
function saveFullCache(data: ParkingDataBundle): void {
  if (!Array.isArray(data.lots) || data.lots.length === 0) {
    return;
  }

  try {
    if (typeof window === "undefined") return;

    const storage = window.localStorage;
    if (!storage) return;

    storage.setItem(
      FULL_CACHE_KEY,
      JSON.stringify({
        ...data,
        isCached: false,
        cachedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.warn(
      "Unable to save parking cache. Continuing with live data:",
      error
    );
  }
}

/**
 * Read the last successful parking response.
 *
 * All storage operations are protected because Safari can deny access
 * to localStorage depending on its privacy settings.
 */
function readFullCache(): ParkingDataBundle | null {
  try {
    if (typeof window === "undefined") return null;

    const storage = window.localStorage;
    if (!storage) return null;

    const raw = storage.getItem(FULL_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ParkingDataBundle>;

    if (!Array.isArray(parsed.lots) || parsed.lots.length === 0) {
      return null;
    }

    return {
      lots: parsed.lots,
      cameras: Array.isArray(parsed.cameras)
        ? parsed.cameras
        : [],
      events: Array.isArray(parsed.events)
        ? parsed.events
        : [],
      isCached: true,
      cachedAt:
        typeof parsed.cachedAt === "string"
          ? parsed.cachedAt
          : null,
    };
  } catch (error) {
    console.warn("Unable to read parking cache:", error);
    return null;
  }
}

function toTypedMockLots(): ParkingLot[] {
  return (MOCK_PARKING_LOTS as any[]).map((lot) => ({
    lot,
    ...lot,
  })) as ParkingLot[];
}

function getMockData(): ParkingDataBundle {
  return {
    lots: toTypedMockLots(),
    cameras: MOCK_CAMERAS as Camera[],
    events: MOCK_EVENTS as TrafficEvent[],
    isCached: false,
    cachedAt: null,
  };
}

/**
 * Loads parking lots, cameras, and traffic events.
 *
 * Parking lots are the primary data. A failure in cameras or events
 * must not prevent parking lots from being shown.
 */
export async function getAllParkingData(): Promise<ParkingDataBundle> {
  if (!USE_API) {
    return getMockData();
  }

  try {
    const [lotsResult, camerasResult, eventsResult] =
      await Promise.allSettled([
        fetchParkingLots(),
        fetchCameras(),
        fetchEvents(),
      ]);

    // Parking lots are essential.
    if (lotsResult.status === "rejected") {
      throw lotsResult.reason;
    }

    const lots = Array.isArray(lotsResult.value)
      ? lotsResult.value
      : [];

    // Cameras and events are optional.
    const cameras: Camera[] =
      camerasResult.status === "fulfilled" &&
      Array.isArray(camerasResult.value)
        ? camerasResult.value
        : [];

    const events: TrafficEvent[] =
      eventsResult.status === "fulfilled" &&
      Array.isArray(eventsResult.value)
        ? eventsResult.value
        : [];

    if (camerasResult.status === "rejected") {
      console.warn(
        "Camera data failed. Parking lots will still be displayed:",
        camerasResult.reason
      );
    }

    if (eventsResult.status === "rejected") {
      console.warn(
        "Traffic events failed. Parking lots will still be displayed:",
        eventsResult.reason
      );
    }

    const liveData: ParkingDataBundle = {
      lots,
      cameras,
      events,
      isCached: false,
      cachedAt: null,
    };

    if (lots.length > 0) {
      // Cache errors are handled inside saveFullCache().
      saveFullCache(liveData);
      return liveData;
    }

    const cached = readFullCache();

    if (cached) {
      return cached;
    }

    return liveData;
  } catch (error) {
    console.warn(
      "Live parking data failed. Trying cached data:",
      error
    );

    const cached = readFullCache();

    if (cached) {
      return cached;
    }

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