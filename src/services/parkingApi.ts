// src/services/parkingApi.ts

import { supabaseRest } from "@/services/supabaseRest";
import type {
  ParkingLot,
  ParkingStatus,
} from "@/types/parking";

function clampInt(v: any, def = 0) {
  const n = Number(v);

  return Number.isFinite(n)
    ? Math.trunc(n)
    : def;
}

function normStatus(
  status: any
): ParkingStatus | undefined {
  const value = String(status ?? "").toLowerCase();

  if (
    value.includes("open") ||
    value.includes("available")
  ) {
    return "available";
  }

  if (
    value.includes("closed") ||
    value.includes("full") ||
    value.includes("busy")
  ) {
    return "busy";
  }

  return undefined;
}

type ViewRow = {
  map_id: string | number;
  map_name: string | null;
  map_data_mode: string | null;
  map_capacity: number | null;
  map_available: number | null;
  map_status: string | null;
  map_updated_at: string | null;

  map_lat?: number | null;
  map_lng?: number | null;
};

export async function fetchParkingLots(): Promise<ParkingLot[]> {
  const data = await supabaseRest.getJson<ViewRow[]>(
    "/parking_app_view?select=map_id,map_name,map_data_mode,map_capacity,map_available,map_status,map_updated_at,map_lat,map_lng"
  );

  /*
   * Temporary Safari diagnostic.
   * This confirms whether the request runs and how many rows Supabase returns.
   */
 

  const rows = Array.isArray(data)
    ? data
    : [];

  return rows
    .filter((row) => row?.map_id != null)
    .map((row) => {
      const mode = String(
        row.map_data_mode ?? ""
      ).toLowerCase();

      const isLive =
        mode === "api" ||
        mode === "realtime";

      const total =
        row.map_capacity == null
          ? 0
          : clampInt(row.map_capacity, 0);

      const free =
        row.map_available == null
          ? null
          : clampInt(row.map_available, 0);

      const occupied =
        total > 0 && free != null
          ? Math.max(
              0,
              Math.min(total, total - free)
            )
          : null;

      const hasValidCoordinates =
        row.map_lat != null &&
        row.map_lng != null &&
        Number.isFinite(Number(row.map_lat)) &&
        Number.isFinite(Number(row.map_lng));

      const lot: ParkingLot = {
        lot: row,

        id: String(row.map_id),
        name: String(
          row.map_name ?? "Unknown"
        ),

        capacity: total || undefined,
        total: total || undefined,
        free,
        occupied,

        status: normStatus(row.map_status),

        map_capacity:
          row.map_capacity ?? null,

        map_available:
          row.map_available ?? null,

        map_status:
          row.map_status ?? null,

        map_updated_at:
          row.map_updated_at ?? null,

        map_data_mode:
          row.map_data_mode ?? null,

        hasLiveData: isLive,

        estimateSource: isLive
          ? "live"
          : "virtual",

        coordinates: hasValidCoordinates
          ? {
              lat: Number(row.map_lat),
              lng: Number(row.map_lng),
            }
          : undefined,

        lastUpdated: row.map_updated_at
          ? new Date(row.map_updated_at)
          : undefined,
      };

      return lot;
    });
}