// src/utils/parking.ts
import type { ParkingLot } from "@/types/parking";

export function safeInt(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

export function safeNum(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function isNil(v: unknown) {
  return v === null || v === undefined;
}

export function getLotCounts(lot: ParkingLot) {
  const anyLot = lot as any;

  //  Detect realtime/api
  const mode = String(anyLot.map_data_mode ?? anyLot.data_mode ?? "").toLowerCase();
  const isRealtime = mode === "api" || mode === "realtime";

  // --- TOTAL ---
  const total = safeInt(anyLot.map_capacity ?? anyLot.capacity ?? anyLot.total, 0);

  if (isRealtime) {
    // IMPORTANT:
    // If available is null/undefined => it's UNKNOWN, do NOT force 0 (0 => 100% occupied)
    const availSrc =
      !isNil(anyLot.map_available) ? anyLot.map_available :
      !isNil(anyLot.available) ? anyLot.available :
      !isNil(anyLot.free) ? anyLot.free :
      null;

    if (availSrc === null) {
      // Unknown counts for realtime lot -> return neutral (not full)
      return { total, free: 0, occupied: 0 };
    }

    const freeRaw = safeInt(availSrc, 0);
    const free = total > 0 ? Math.min(Math.max(freeRaw, 0), total) : Math.max(freeRaw, 0);
    const occupied = total > 0 ? Math.max(0, total - free) : 0;

    return { total, free, occupied };
  }

  //  Estimated / virtual / heuristic
  const freeProvided =
    anyLot.map_available != null
      ? safeInt(anyLot.map_available, 0)
      : anyLot.free != null
      ? safeInt(anyLot.free, 0)
      : null;

  const occProvided = anyLot.occupied != null ? safeInt(anyLot.occupied, 0) : null;

  let free =
    freeProvided !== null
      ? total > 0
        ? Math.min(Math.max(freeProvided, 0), total)
        : Math.max(freeProvided, 0)
      : 0;

  let occupied =
    occProvided !== null
      ? total > 0
        ? Math.min(Math.max(occProvided, 0), total)
        : Math.max(occProvided, 0)
      : 0;

  if (freeProvided === null && occProvided !== null) {
    free = Math.max(0, total - occupied);
  } else if (occProvided === null && freeProvided !== null) {
    occupied = Math.max(0, total - free);
  } else if (freeProvided === null && occProvided === null) {
    // unknown counts: be neutral (not full)
    free = 0;
    occupied = 0;
  }

  if (total > 0) {
    free = Math.min(Math.max(free, 0), total);
    occupied = Math.min(Math.max(occupied, 0), total);

    if (free + occupied > total) {
      occupied = Math.min(occupied, total);
      free = Math.max(0, total - occupied);
    }
  } else {
    free = Math.max(0, free);
    occupied = Math.max(0, occupied);
  }

  return { total, free, occupied };
}

export function getConfPct(lot: ParkingLot) {
  const conf = safeNum((lot as any).conf ?? (lot as any).confidence, 0);
  const pct = conf > 1 ? conf : conf * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export const getConfidencePct = getConfPct;

export function hasLotCounts(lot: ParkingLot): boolean {
  const anyLot = lot as any;
  return anyLot.map_available != null || anyLot.available != null || anyLot.free != null || anyLot.occupied != null;
}

export type AvailabilityLevel = "available" | "moderate" | "busy";

export function getFreePct(lot: ParkingLot): number | null {
  const { total, free } = getLotCounts(lot);

  if (!total || total <= 0) return null;
  if (!hasLotCounts(lot)) return null;

  const pct = Math.round((Number(free ?? 0) / Number(total)) * 100);
  return Math.max(0, Math.min(100, pct));
}

export function availabilityLevelByFreePct(pct: number): AvailabilityLevel {
  if (pct >= 60) return "available";
  if (pct >= 30) return "moderate";
  return "busy";
}

