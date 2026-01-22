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
};

function isRest404(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  return msg.includes("REST 404") || msg.includes("status of 404") || msg.includes(" 404 ");
}

export async function getAllParkingData(): Promise<ParkingDataBundle> {
  // Use mock data if configured
  if (!USE_API) {
    return { lots: MOCK_PARKING_LOTS, cameras: MOCK_CAMERAS, events: MOCK_EVENTS };
  }

  try {
    const [lots, cameras, events] = await Promise.all([
      fetchParkingLots(),
      fetchCameras(),
      fetchEvents(),
    ]);

    return { lots, cameras, events };
  } catch (err) {
    // handle Supabase REST 404 errors by falling back to mock data
    if (isRest404(err)) {
      console.warn("Supabase REST 404 → falling back to mock data:", err);
      return { lots: MOCK_PARKING_LOTS, cameras: MOCK_CAMERAS, events: MOCK_EVENTS };
    }

    // re-throw other errors
    throw err;
  }
}

// Re-export for simpler imports
export { getAllParkingData as getTrafficData };
