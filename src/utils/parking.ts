import type { ParkingLot } from "@/types/parking";

export function safeInt(x: unknown, fallback = 0) {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

export function safeNum(x: unknown, fallback = 0) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export function getLotCounts(lot: ParkingLot) {
  const total = safeInt((lot as any).total ?? (lot as any).capacity, 0);

  const hasLiveData =
    (lot as any).hasLiveData === true ||
    (lot as any).api_available != null ||
    (lot as any).api_occupied != null ||
    (lot as any).api_status != null;

  if (!hasLiveData) {
    return { total, free: 0, occupied: 0 };
  }

  const free = safeInt((lot as any).free, 0);
  const occupied = Math.max(0, Math.min(total, total - free));

  return { total, free: Math.min(free, total), occupied };
}

export function getConfidencePct(lot: ParkingLot) {
  const conf = safeNum((lot as any).conf ?? (lot as any).confidence, 0);
  const pct = conf > 1 ? conf : conf * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}


