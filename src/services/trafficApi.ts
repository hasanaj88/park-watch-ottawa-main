import { supabaseRest } from "@/services/supabaseRest";
import type { Camera, TrafficEvent } from "@/lib/traffic/trafficSummary";

export async function fetchCameras(): Promise<Camera[]> {
  const data = await supabaseRest.getJson<Camera[]>(`/cameras?select=*`);
  return Array.isArray(data) ? data : [];
}

export async function fetchEvents(): Promise<TrafficEvent[]> {
  // traffic_events
  const data = await supabaseRest.getJson<TrafficEvent[]>(`/traffic_events?select=*`);
  return Array.isArray(data) ? data : [];
}

