import type { ParkingLot, ParkingStatus } from "@/types/parking";

export function safeInt(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

export function safeNum(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export function getLotCounts(lot: ParkingLot) {
  const total = safeInt(lot.total ?? lot.capacity, 0);
  const occ = safeInt(lot.occupied, 0);

  const freeRaw =
    lot.free !== undefined && lot.free !== null
      ? safeInt(lot.free, 0)
      : Math.max(0, total - occ);

  const free = Math.max(0, Math.min(freeRaw, total));
  const occupied = Math.max(0, Math.min(total - free, total));

  return { total, free, occupied };
}

export function getConfPct(lot: ParkingLot) {
  const conf = safeNum(lot.conf ?? lot.confidence, 0);
  const pct = conf > 1 ? conf : conf * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function normalizeApiStatus(s: string | null | undefined): ParkingStatus | null {
  if (!s) return null;
  const x = String(s).toLowerCase().trim();

  if (
    x === "busy" ||
    x === "full" ||
    x === "closed" ||
    x === "unavailable" ||
    x === "offline"
  ) return "busy";

  if (
    x === "available" ||
    x === "open" ||
    x === "ok" ||
    x === "spaces"
  ) return "available";

  return null;
}

export function statusFromCounts(
  free: number,
  apiStatusRaw?: string | null
): ParkingStatus {
  const api = normalizeApiStatus(apiStatusRaw);

  // Use counts as truth
  let status: ParkingStatus = free > 0 ? "available" : "busy";

  // Optional hard override for "closed"
  const raw = String(apiStatusRaw ?? "").toLowerCase();
  if (raw.includes("closed")) status = "busy";

  // If API explicitly says available, keep available (does not override closed)
  if (status !== "busy" && api === "available") status = "available";

  return status;
}

export function ensureUiDefaults(lot: Partial<ParkingLot> & Pick<ParkingLot, "id" | "name">): ParkingLot {
  const capacity = safeInt(lot.capacity, 0);
  const occupied = safeInt(lot.occupied, 0);

  const total = safeInt(lot.total ?? capacity, capacity);
  const free = safeInt(lot.free ?? Math.max(0, total - occupied), Math.max(0, total - occupied));

  const counts = {
    total,
    free: Math.max(0, Math.min(free, total)),
    occupied: Math.max(0, Math.min(total - Math.max(0, Math.min(free, total)), total)),
  };

  return {
    id: String(lot.id),
    name: String(lot.name),

    capacity: counts.total,
    occupied: counts.occupied,
    total: counts.total,
    free: counts.free,

    status: lot.status ?? statusFromCounts(counts.free, null),

    confidence: safeNum(lot.confidence ?? lot.conf ?? 0.9, 0.9),
    conf: safeNum(lot.conf ?? lot.confidence ?? 0.9, 0.9),

    address: lot.address ?? "—",
    coordinates: lot.coordinates ?? { lat: 0, lng: 0 },

    pricing: lot.pricing ?? { rate: "—", maxStay: "—", openUntil: "—" },
    amenities: Array.isArray(lot.amenities) ? lot.amenities : [],

    lastUpdated: lot.lastUpdated instanceof Date ? lot.lastUpdated : new Date(),
    distanceKm: lot.distanceKm,
  };
}
