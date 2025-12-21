import { supabaseRest } from "@/services/supabaseRest";
import type { ParkingLot } from "@/components/parking/ParkingCard";

export async function fetchParkingLots(): Promise<ParkingLot[]> {
  const data = await supabaseRest.getJson<any[]>(
    `/parking_lots?select=id,name,status,lat,lng,capacity,available`
  );

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    capacity: Number(p.capacity ?? 0),
    available: Number(p.available ?? 0),
    lat: p.lat != null ? Number(p.lat) : undefined,
    lng: p.lng != null ? Number(p.lng) : undefined,

    // optional nested coords if you still want them:
    coordinates:
      p.lat != null && p.lng != null
        ? { lat: Number(p.lat), lng: Number(p.lng) }
        : undefined,
  }));
}

