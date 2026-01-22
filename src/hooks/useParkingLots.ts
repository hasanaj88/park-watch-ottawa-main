// src/hooks/useParkingLots.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllParkingData } from "@/services/trafficDataProvider";
import type { ParkingLot, ParkingFilters } from "@/types/parking";
import { getFreePct, availabilityLevelByFreePct } from "@/utils/parking";

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeLot(src: any): ParkingLot {
  //  ID: use map_id first (your view) then id, then lot_id (legacy)
  const rawId = src?.map_id ?? src?.id ?? src?.lot_id ?? src?.lot?.id;
  const id = String(rawId ?? "").trim();

  const name = (src?.map_name ?? src?.name ?? src?.lot?.name ?? "Unknown").toString();

  const capacityRaw = src?.map_capacity ?? src?.capacity ?? src?.total ?? 0;
  const availableRaw = src?.map_available ?? src?.available ?? src?.free;
  const occupiedRaw = src?.occupied;

  const capacity = toNumber(capacityRaw, 0);
  const total = capacity;

  let free: number | null = null;
  if (availableRaw !== undefined && availableRaw !== null) {
    free = clamp(toNumber(availableRaw, 0), 0, capacity);
  } else if (occupiedRaw !== undefined && occupiedRaw !== null) {
    free = clamp(capacity - toNumber(occupiedRaw, 0), 0, capacity);
  }

  const lat = src?.map_lat ?? src?.lat ?? src?.coordinates?.lat;
  const lng = src?.map_lng ?? src?.lng ?? src?.coordinates?.lng;

  return {
    lot: src?.lot ?? src,
    id,
    name,

    capacity,
    total,

    free,
    occupied: occupiedRaw == null ? null : toNumber(occupiedRaw, 0),

    status: src?.map_status ?? src?.status ?? null,
    confidence: src?.confidence ?? null,
    conf: src?.conf ?? null,

    //  keep mode for API/virtual detection (used by useEnhancedLots)
    map_data_mode: src?.map_data_mode ?? src?.data_mode ?? null,

    address: src?.address ?? null,

    coordinates: lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : undefined,

    pricing: src?.pricing,
    amenities: src?.amenities,

    lastUpdated: src?.lastUpdated ?? null,
    distanceKm: src?.distanceKm ?? null,

    map_capacity: src?.map_capacity ?? null,
    map_available: src?.map_available ?? null,
    map_status: src?.map_status ?? null,
    map_updated_at: src?.map_updated_at ?? null,

    hasLiveData: src?.hasLiveData ?? (src?.data_mode === "realtime" || src?.has_live_api === true),
    estimateSource: src?.estimateSource,
  } as any;
}

//  DO NOT TOUCH real/live lots
function isLiveLot(lot: ParkingLot) {
  return lot.hasLiveData === true || lot.estimateSource === "live";
}

//  Virtual-only minute tick (updates only virtual/heuristic lots)
function tickVirtualLots(lot: ParkingLot, now: Date): ParkingLot {
  if (isLiveLot(lot)) return lot;
  return { ...lot, lastUpdated: now };
}

export function useParkingLots() {
  const [allLots, setAllLots] = useState<ParkingLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>("");

  const [filters, setFilters] = useState<ParkingFilters>({
    query: "",
    onlyAvailable: false,
    refreshInterval: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const bundle = await getAllParkingData(); // { lots, cameras, events }
      const normalized = (bundle?.lots ?? [])
        .map(normalizeLot)
        .filter((l) => Boolean(l.id)); // keep only valid ids

      setAllLots(normalized);

      setSelectedLotId((prev) => {
        if (!prev) return "";
        const exists = normalized.some((l) => String(l.id) === String(prev));
        return exists ? prev : "";
      });
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  //  Every minute: update ONLY virtual lots (no API call, no live modifications)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setAllLots((prev) => prev.map((l) => tickVirtualLots(l, now)));
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  const updateFilters = useCallback((next: Partial<ParkingFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const selectLot = useCallback((id: string) => setSelectedLotId(String(id)), []);
  const clearSelectedLot = useCallback(() => setSelectedLotId(""), []);
  const refreshData = useCallback(() => load(), [load]);

  const selectedLot = useMemo(() => {
    if (!selectedLotId) return null;
    return allLots.find((l) => String(l.id) === String(selectedLotId)) ?? null;
  }, [allLots, selectedLotId]);

  const lots = useMemo(() => {
    const q = (filters.query ?? "").trim().toLowerCase();
    let base = allLots;

    if (q) {
      base = base.filter((l) => {
        const name = String(l.name ?? "").toLowerCase();
        const address = String(l.address ?? "").toLowerCase();
        return name.includes(q) || address.includes(q);
      });
    }

    // Available only = show only (available + moderate) by your thresholds
    if (filters.onlyAvailable) {
      base = base.filter((l) => {
        const pct = getFreePct(l);
        if (pct === null) return false; // hide "No live data"
        const level = availabilityLevelByFreePct(pct);
        return level === "available" || level === "moderate";
      });
    }

    return base;
  }, [allLots, filters]);

  const getAvailabilityPercentage = useCallback((lot: ParkingLot) => {
    const total = lot.total ?? lot.capacity ?? 0;
    const free = lot.free ?? 0;
    if (!total || total <= 0) return 0;
    return clamp(Math.round((Number(free) / Number(total)) * 100), 0, 100);
  }, []);

  const searchLots = useCallback(
    async (query: string) => {
      const q = (query ?? "").trim().toLowerCase();
      if (!q) return lots;

      return allLots.filter((l) => {
        const name = String(l.name ?? "").toLowerCase();
        const address = String(l.address ?? "").toLowerCase();
        return name.includes(q) || address.includes(q);
      });
    },
    [allLots, lots]
  );

  return {
    lots,
    allLots,

    selectedLot,
    selectedLotId,

    filters,
    updateFilters,

    selectLot,
    clearSelectedLot,

    refreshData,
    getAvailabilityPercentage,
    searchLots,

    isLoading,
    loading: isLoading, // backward-compatible
    error,
  };
}
