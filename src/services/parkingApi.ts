// src/services/parkingApi.ts
import { supabaseRest } from "@/services/supabaseRest";
import type { ParkingLot, ParkingStatus } from "@/types/parking";

function clampInt(v: any, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

function normStatus(s: any): ParkingStatus | undefined {
  const v = String(s ?? "").toLowerCase();
  if (v.includes("open") || v.includes("available")) return "available";
  if (v.includes("closed") || v.includes("full") || v.includes("busy")) return "busy";
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

  // optional
  map_lat?: number | null;
  map_lng?: number | null;
};

export async function fetchParkingLots(): Promise<ParkingLot[]> {
  const data = await supabaseRest.getJson<ViewRow[]>(
    "/parking_app_view?select=map_id,map_name,map_data_mode,map_capacity,map_available,map_status,map_updated_at,map_lat,map_lng"
  );

  return (Array.isArray(data) ? data : [])
    .filter((r) => r?.map_id != null)
    .map((r) => {
      const mode = String(r.map_data_mode ?? "").toLowerCase();
      const isLive = mode === "api" || mode === "realtime";

      const total = r.map_capacity == null ? 0 : clampInt(r.map_capacity, 0);

      // canonical counts
      const free = r.map_available == null ? null : clampInt(r.map_available, 0);

      const occupied =
        total > 0 && free != null ? Math.max(0, Math.min(total, total - free)) : null;

      const lot: ParkingLot = {
        lot: r,

        id: String(r.map_id),
        name: String(r.map_name ?? "Unknown"),

        // canonical counts
        capacity: total || undefined,
        total: total || undefined,
        free,
        occupied,

        status: normStatus(r.map_status),

        map_capacity: r.map_capacity ?? null,
        map_available: r.map_available ?? null,
        map_status: r.map_status ?? null,
        map_updated_at: r.map_updated_at ?? null,
        map_data_mode: r.map_data_mode ?? null,

        // extras
        hasLiveData: isLive,
        estimateSource: isLive ? "live" : "virtual",

        coordinates:
          r.map_lat != null && r.map_lng != null
            ? { lat: Number(r.map_lat), lng: Number(r.map_lng) }
            : undefined,

        lastUpdated: r.map_updated_at ? new Date(r.map_updated_at) : undefined,
      };

      return lot;
    });
}
