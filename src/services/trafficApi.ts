import { supabaseRest } from "@/services/supabaseRest";
import type { Camera, TrafficEvent } from "@/lib/traffic/trafficSummary";

function is404(err: unknown) {
  const status = (err as any)?.status;
  if (status === 404) return true;
  const msg = String((err as any)?.message ?? err ?? "");
  return msg.includes("REST status 404") || msg.includes("REST 404");
}

export async function fetchCameras(): Promise<Camera[]> {
  try {
    // TODO: replace select=* with explicit columns once schema is confirmed
    const data = await supabaseRest.getJson<Camera[]>(`/cameras?select=*`);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (!is404(e)) console.warn("fetchCameras failed:", e);
    return [];
  }
}

export async function fetchEvents(): Promise<TrafficEvent[]> {
  try {
    // TODO: replace select=* with explicit columns once schema is confirmed
    // Optional: limit + order (uncomment if your table has updated_at)
    // const data = await supabaseRest.getJson<TrafficEvent[]>(`/traffic_events?select=*&order=updated_at.desc&limit=200`);
    const data = await supabaseRest.getJson<TrafficEvent[]>(`/traffic_events?select=*`);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (!is404(e)) console.warn("fetchEvents failed:", e);
    return [];
  }
}

