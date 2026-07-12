import { supabaseRest } from "@/services/supabaseRest";
import type { Camera, TrafficEvent } from "@/lib/traffic/trafficSummary";

const CAMERAS_CACHE_KEY = "ottawa_last_cameras";
const EVENTS_CACHE_KEY = "ottawa_last_events";

function is404(err: unknown) {
  const status = (err as any)?.status;
  if (status === 404) return true;
  const msg = String((err as any)?.message ?? err ?? "");
  return msg.includes("REST status 404") || msg.includes("REST 404");
}

function saveCache<T>(key: string, data: T[]) {
  if (Array.isArray(data) && data.length > 0) {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        savedAt: new Date().toISOString(),
      })
    );
  }
}

function readCache<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.data) ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function fetchCameras(): Promise<Camera[]> {
  try {
    const data = await supabaseRest.getJson<Camera[]>(`/cameras?select=*`);
    const cameras = Array.isArray(data) ? data : [];

    saveCache<Camera>(CAMERAS_CACHE_KEY, cameras);
    return cameras;
  } catch (e) {
    if (!is404(e)) console.warn("fetchCameras failed, using cached data:", e);
    return readCache<Camera>(CAMERAS_CACHE_KEY);
  }
}

export async function fetchEvents(): Promise<TrafficEvent[]> {
  try {
    const data = await supabaseRest.getJson<TrafficEvent[]>(
      `/traffic_events?select=*`
    );
    const events = Array.isArray(data) ? data : [];

    saveCache<TrafficEvent>(EVENTS_CACHE_KEY, events);
    return events;
  } catch (e) {
    if (!is404(e)) console.warn("fetchEvents failed, using cached data:", e);
    return readCache<TrafficEvent>(EVENTS_CACHE_KEY);
  }
}