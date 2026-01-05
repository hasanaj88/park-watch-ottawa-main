import { supabaseRest } from "@/services/supabaseRest";
import type { ParkingLot } from "@/components/parking/ParkingCard";

function clampInt(v: any, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

export async function fetchParkingLots(): Promise<ParkingLot[]> {
  const data = await supabaseRest.getJson<any[]>(
    `/parking_lots?select=id,name,address,status,lat,lng,capacity,available,data_mode`
  );

  return (data ?? []).map((p) => {
    const total = clampInt(p.capacity, 0);
    const free = clampInt(p.available, 0);
    const occupied = Math.max(total - free, 0);

    // Confidence suggestion (API > virtual > unknown)
    const dataMode = String(p.data_mode ?? "");
    const confidence =
      dataMode === "api" ? 0.95 :
      dataMode === "virtual" ? 0.80 :
      0.65;

    return {
      id: String(p.id),
      name: String(p.name ?? ""),
      address: p.address ?? undefined,

      // keep your status
      status: String(p.status ?? "unknown"),

      //  fields your UI likes (based on your card)
      total,
      free,
      occupied,
      confidence,

      // keep both shapes
      capacity: total,
      available: free,

      lat: p.lat != null ? Number(p.lat) : undefined,
      lng: p.lng != null ? Number(p.lng) : undefined,
      coordinates:
        p.lat != null && p.lng != null
          ? { lat: Number(p.lat), lng: Number(p.lng) }
          : undefined,
    } as ParkingLot;
  });
}


