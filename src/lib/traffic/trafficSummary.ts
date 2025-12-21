// src/lib/traffic/trafficSummary.ts
export type LatLng = { lat: number; lng: number };

export type Camera = {
  id: number | string;
  name: string;
  coordinates: LatLng;
};

export type TrafficEvent = {
  id: string;
  headline?: string;
  message?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW" | string;
  coordinates: LatLng;
};

export type PriorityCounts = { HIGH: number; MEDIUM: number; LOW: number };

export type ParkingTrafficSummary = {
  parkingId: string;
  radiusM: number;

  nearbyCameraCount: number;
  nearestCameras: Array<{ id: Camera["id"]; name: string; distanceM: number }>;

  nearbyEventCount: number;
  priorityCounts: PriorityCounts;
  maxPriority: "HIGH" | "MEDIUM" | "LOW" | "NONE";

  disruptionScore: number; // 0..100
  updatedAtISO: string;
};

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function hasLatLng(x: any): x is LatLng {
  return (
    x &&
    typeof x.lat === "number" &&
    Number.isFinite(x.lat) &&
    typeof x.lng === "number" &&
    Number.isFinite(x.lng)
  );
}

// Haversine distance in meters
export function distanceMeters(a?: LatLng | null, b?: LatLng | null): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;

  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizePriority(p?: string): "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" {
  const x = (p || "").toUpperCase();
  if (x.includes("HIGH")) return "HIGH";
  if (x.includes("MEDIUM")) return "MEDIUM";
  if (x.includes("LOW")) return "LOW";
  return "UNKNOWN";
}

function distanceMultiplier(d: number): number {
  if (d <= 200) return 1.4;
  if (d <= 500) return 1.2;
  return 1.0;
}

function weightPriority(p: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"): number {
  if (p === "HIGH") return 40;
  if (p === "MEDIUM") return 20;
  if (p === "LOW") return 10;
  return 5;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function buildParkingTrafficSummary(args: {
  parkingId: string;
  parkingCoord: LatLng;
  cameras: Camera[];
  events: TrafficEvent[];
  radiusM?: number;
  nearestCamerasLimit?: number;
}): ParkingTrafficSummary {
  const radiusM = args.radiusM ?? 800;
  const nearestLimit = args.nearestCamerasLimit ?? 3;

  // Cameras near
  const safeCameras = args.cameras.filter((c) => hasLatLng(c.coordinates));

  const camerasWithDist = safeCameras
    .map((c) => ({
      id: c.id,
      name: c.name,
      distanceM: Math.round(distanceMeters(args.parkingCoord, c.coordinates)),
    }))
    .sort((a, b) => a.distanceM - b.distanceM);

  const nearbyCameras = camerasWithDist.filter((c) => c.distanceM <= radiusM);

  // Events near + scoring
  const counts: PriorityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let eventScore = 0;

  for (const ev of args.events) {
    if (!hasLatLng(ev.coordinates)) continue;

    const d = distanceMeters(args.parkingCoord, ev.coordinates);
    if (d > radiusM) continue; // too far

    const p = normalizePriority(ev.priority);
    if (p === "HIGH") counts.HIGH++;
    else if (p === "MEDIUM") counts.MEDIUM++;
    else if (p === "LOW") counts.LOW++;

    eventScore += weightPriority(p) * distanceMultiplier(d);
  }

  const nearbyEventCount = counts.HIGH + counts.MEDIUM + counts.LOW;

  let maxPriority: ParkingTrafficSummary["maxPriority"] = "NONE";
  if (counts.HIGH > 0) maxPriority = "HIGH";
  else if (counts.MEDIUM > 0) maxPriority = "MEDIUM";
  else if (counts.LOW > 0) maxPriority = "LOW";

  // camera factor (reduce uncertainty)
  const cameraFactor = clamp(nearbyCameras.length * 3, 0, 15);
  const disruptionScore = clamp(Math.round(eventScore - cameraFactor), 0, 100);

  return {
    parkingId: args.parkingId,
    radiusM,
    nearbyCameraCount: nearbyCameras.length,
    nearestCameras: camerasWithDist.slice(0, nearestLimit),
    nearbyEventCount,
    priorityCounts: counts,
    maxPriority,
    disruptionScore,
    updatedAtISO: new Date().toISOString(),
  };
}

export function buildAllSummaries<T extends { id: string; coordinates?: LatLng }>(
  lots: T[],
  cameras: Camera[],
  events: TrafficEvent[],
  radiusM = 800
) {
  const map: Record<string, ParkingTrafficSummary> = {};

  for (const lot of lots) {
    if (!hasLatLng(lot.coordinates)) continue;

    map[lot.id] = buildParkingTrafficSummary({
      parkingId: lot.id,
      parkingCoord: lot.coordinates,
      cameras,
      events,
      radiusM,
      nearestCamerasLimit: 3,
    });
  }

  return map;
}
