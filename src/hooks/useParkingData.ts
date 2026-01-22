// src/hooks/useParkingData.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import type { ParkingLot, ParkingFilters, ParkingStatus } from "@/types/parking";
import { useToast } from "@/hooks/use-toast";
import {
  calculateDistance,
  parseAddressToCoordinates,
  parsePostalCodeToCoordinates,
  isPostalCode,
} from "@/utils/distance";
import { geocodeOttawa } from "@/utils/geocode";
import { supabase } from "@/services/supabaseClient";
import { safeInt, safeNum, getLotCounts } from "@/utils/parking";

/** ================================
 *   Search helpers
 *  ================================ */
const normalizeLotName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/city parking/g, "")
    .replace(/\s+/g, " ")
    .trim();

const STOPWORDS = new Set([
  "parking",
  "park",
  "lot",
  "lots",
  "garage",
  "garages",
  "parkade",
  "parkades",
  "location",
  "locations",
  "spot",
  "spots",
  "near",
  "nearest",
  "find",
  "show",
  "me",
]);

const normalizeWord = (w: string) => {
  const x = w.toLowerCase().trim();
  if (!x) return "";
  if (x.length > 3 && x.endsWith("s")) return x.slice(0, -1);
  return x;
};

const normalizeQueryToWords = (q: string) => {
  const searchTerm = q.toLowerCase().trim();
  const rawWords = searchTerm.split(/\s+/).map(normalizeWord);
  const meaningfulWords = rawWords.filter((w) => w && !STOPWORDS.has(w));
  return { searchTerm, meaningfulWords };
};

/** ================================
 *   DB row shape (parking_app_view)
 *  ================================ */
type DbParkingLot = {
  id: string; // map_id aliased to string
  ottawa_lot_id?: string | null;
  name: string; // map_name
  capacity: number | null; // map_capacity

  api_available: number | null; // map_available
  api_occupied: number | null; // (optional if you add later)
  virtual_occupied: number | null; // (optional if you add later)
  api_status: string | null; // map_status

  lat: number | null; // map_lat
  lng: number | null; // map_lng
  created_at?: string | null; // map_updated_at
};

const STATUS_AVAILABLE: ParkingStatus = "available";
const STATUS_BUSY: ParkingStatus = "busy";

const toUiStatus = (s: string | null | undefined): ParkingStatus => {
  const x = String(s ?? "").toLowerCase().trim();
  if (x === "available" || x === "open") return STATUS_AVAILABLE;
  return STATUS_BUSY;
};

export function getConfPct(lot: ParkingLot) {
  const conf = safeNum((lot as any).conf ?? (lot as any).confidence, 0);
  const pct = conf > 1 ? conf : conf * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** ================================
 *   Heuristic estimation
 *  ================================ */
function hashToSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

type LotKind = "downtown" | "hospital" | "transit" | "generic";

function detectLotKind(name: string, lat: number | null, lng: number | null): LotKind {
  const n = name.toLowerCase();

  if (
    n.includes("hospital") ||
    n.includes("civic") ||
    n.includes("general") ||
    n.includes("queensway")
  ) {
    return "hospital";
  }
  if (
    n.includes("station") ||
    n.includes("o-train") ||
    n.includes("park and ride") ||
    n.includes("park & ride")
  ) {
    return "transit";
  }

  if (lat != null && lng != null) {
    const inCore = lat >= 45.415 && lat <= 45.43 && lng >= -75.71 && lng <= -75.68;
    if (inCore) return "downtown";
  }

  if (
    n.includes("slater") ||
    n.includes("queen") ||
    n.includes("bank") ||
    n.includes("rideau") ||
    n.includes("byward")
  ) {
    return "downtown";
  }

  return "generic";
}

function peakFactor(now: Date): number {
  const day = now.getDay();
  const hour = now.getHours();
  const isWeekend = day === 0 || day === 6;

  if (!isWeekend) {
    if (hour >= 7 && hour <= 10) return 1.0;
    if (hour >= 15 && hour <= 18) return 0.9;
    if (hour >= 11 && hour <= 14) return 0.7;
    if (hour >= 19 && hour <= 22) return 0.6;
    return 0.45;
  }

  if (hour >= 11 && hour <= 17) return 0.85;
  if (hour >= 18 && hour <= 22) return 0.65;
  return 0.4;
}

function baseOccupancyByKind(kind: LotKind): { base: number; peakBoost: number; min: number; max: number } {
  switch (kind) {
    case "downtown":
      return { base: 0.55, peakBoost: 0.3, min: 0.25, max: 0.95 };
    case "hospital":
      return { base: 0.5, peakBoost: 0.25, min: 0.2, max: 0.9 };
    case "transit":
      return { base: 0.35, peakBoost: 0.35, min: 0.1, max: 0.95 };
    default:
      return { base: 0.4, peakBoost: 0.2, min: 0.1, max: 0.85 };
  }
}

function estimateOccupied(
  lotId: string | number,
  name: string,
  capacity: number,
  lat: number | null,
  lng: number | null,
  now: Date
): { occupied: number; confidence: number } {
  if (capacity <= 0) return { occupied: 0, confidence: 0.2 };

  const kind = detectLotKind(name, lat, lng);
  const { base, peakBoost, min, max } = baseOccupancyByKind(kind);
  const pf = peakFactor(now);

  const bucket = Math.floor(now.getTime() / (15 * 1000));
  const seed = hashToSeed(`${lotId}|${bucket}`);
  const rand = mulberry32(seed);
  const noise = (rand() - 0.5) * 0.12;

  const ratioRaw = base + peakBoost * (pf - 0.5) + noise;
  const ratio = clamp(ratioRaw, min, max);

  const occupied = clamp(Math.round(ratio * capacity), 0, capacity);

  const capFactor = clamp(capacity / 200, 0.2, 1.0);
  const peakConf = clamp(pf, 0.4, 1.0);
  const confidence = clamp(0.25 + 0.35 * peakConf + 0.2 * capFactor, 0.25, 0.75);

  return { occupied, confidence };
}

/** ================================
 *   Local lot shape used in hook
 *  ================================ */
type ParkingLotWithExtras = ParkingLot & {
  total?: number;
  free?: number | null;
  occupied?: number | null;
  conf?: number;
  hasLiveData?: boolean;
  ottawa_lot_id?: string | null;
  estimateSource?: "live" | "virtual" | "heuristic";
};

const mapDbLotToParkingLot = (row: DbParkingLot): ParkingLotWithExtras => {
  const capacity = safeInt(row.capacity, 0);

  const apiAvailable =
    typeof row.api_available === "number" && Number.isFinite(row.api_available)
      ? safeInt(row.api_available, 0)
      : null;

  const apiOccupied =
    typeof row.api_occupied === "number" && Number.isFinite(row.api_occupied)
      ? safeInt(row.api_occupied, 0)
      : null;

  const virtualOccupied =
    typeof row.virtual_occupied === "number" && Number.isFinite(row.virtual_occupied)
      ? safeInt(row.virtual_occupied, 0)
      : null;

  const lat = typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null;
  const lng = typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null;

  const hasLiveData = apiAvailable !== null || apiOccupied !== null || row.api_status !== null;
  const hasVirtualData = virtualOccupied !== null && virtualOccupied >= 0;

  let free: number | null = null;
  let occupied: number | null = null;
  let status: ParkingStatus = STATUS_BUSY;
  let confidence = 0;

  type EstimateSource = "live" | "virtual" | "heuristic";
  let estimateSource: EstimateSource = "heuristic";

  // 1) LIVE
  if (capacity > 0 && hasLiveData) {
    estimateSource = "live";

    if (apiAvailable !== null) {
      free = clamp(apiAvailable, 0, capacity);
      occupied =
        apiOccupied !== null
          ? clamp(apiOccupied, 0, capacity)
          : clamp(capacity - free, 0, capacity);
    } else if (apiOccupied !== null) {
      occupied = clamp(apiOccupied, 0, capacity);
      free = clamp(capacity - occupied, 0, capacity);
    } else {
      free = null;
      occupied = null;
    }

    status = row.api_status ? toUiStatus(row.api_status) : free !== null && free > 0 ? STATUS_AVAILABLE : STATUS_BUSY;
    confidence = 0.95;
  }

  // 2) VIRTUAL
  if (capacity > 0 && !hasLiveData && hasVirtualData) {
    estimateSource = "virtual";

    occupied = clamp(virtualOccupied!, 0, capacity);
    free = clamp(capacity - occupied, 0, capacity);
    status = free > 0 ? STATUS_AVAILABLE : STATUS_BUSY;
    confidence = 0.65;
  }

  // 3) HEURISTIC
  if (capacity > 0 && !hasLiveData && !hasVirtualData) {
    estimateSource = "heuristic";

    const now = new Date();
    const est = estimateOccupied(row.id, row.name, capacity, lat, lng, now);

    occupied = clamp(est.occupied, 0, capacity);
    free = clamp(capacity - occupied, 0, capacity);

    status = (free / capacity) * 100 >= 30 ? STATUS_AVAILABLE : STATUS_BUSY;
    confidence = est.confidence;
  }

  const lastUpdated =
    estimateSource === "heuristic"
      ? new Date()
      : row.created_at
      ? new Date(row.created_at)
      : new Date();

  return {
    //  keep raw row for debug (and satisfies ParkingLot.lot if you ever make it required again)
    lot: row,

    id: String(row.id),
    ottawa_lot_id: row.ottawa_lot_id ?? null,
    name: row.name,

    capacity,
    total: capacity,

    free,
    occupied,

    status,

    confidence,
    conf: confidence,

    address: "",
    amenities: [],
    pricing: { rate: "—", maxStay: "—", openUntil: "—" },

    coordinates: { lat: lat ?? 0, lng: lng ?? 0 },

    lastUpdated,
    hasLiveData,
    estimateSource,
  };
};

const dedupLots = (items: ParkingLotWithExtras[]) => {
  const seen = new Set<string>();
  const out: ParkingLotWithExtras[] = [];

  for (const lot of items) {
    const ottId = (lot.ottawa_lot_id ?? "").trim();
    const lat = Number(lot.coordinates?.lat ?? 0).toFixed(6);
    const lng = Number(lot.coordinates?.lng ?? 0).toFixed(6);
    const baseName = normalizeLotName(lot.name ?? "");

    const key = ottId
      ? `ott:${ottId}`
      : lat !== "0.000000" || lng !== "0.000000"
      ? `geo:${lat},${lng}|${baseName}`
      : `id:${String(lot.id)}`;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lot);
  }

  return out;
};

function mergeLots(prev: ParkingLotWithExtras[], next: ParkingLotWithExtras[]) {
  const prevMap = new Map<string, ParkingLotWithExtras>();
  for (const p of prev) prevMap.set(String(p.id), p);

  return next.map((n) => {
    const p = prevMap.get(String(n.id));
    if (!p) return n;

    if ((n as any).estimateSource === "heuristic") {
      return {
        ...n,
        free: p.free,
        occupied: p.occupied,
        status: p.status,
        confidence: p.confidence,
        conf: p.conf,
        lastUpdated: p.lastUpdated,
      };
    }

    return n;
  });
}

export const useParkingData = () => {
  const [lotsState, setLotsState] = useState<ParkingLotWithExtras[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>("");

  const [filters, setFilters] = useState<ParkingFilters>({
    query: "",
    onlyAvailable: false,
    refreshInterval: 60_000, // default 1 minute
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLots = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("parking_app_view")
        .select(
          `
          id:map_id,
          ottawa_lot_id,
          name:map_name,
          capacity:map_capacity,
          api_available:map_available,
          api_status:map_status,
          lat:map_lat,
          lng:map_lng,
          created_at:map_updated_at
        `
        )
        .order("map_name", { ascending: true });

      if (error) throw error;

      const rows = Array.isArray(data) ? (data as DbParkingLot[]) : [];
      const mapped = rows.filter((r) => r && r.id && r.name).map(mapDbLotToParkingLot);
      const clean = dedupLots(mapped);
      
      // ✅ DEV ONLY: expose to browser console
if (import.meta.env.DEV) {
  (window as any).__PARKING_DEBUG__ = {
    ts: new Date().toISOString(),
    lots: clean,     // أو lotsState لو تحب
    raw: rows,       // مفيد جدًا للتأكد من map_available/capacity
  };
}


      setLotsState((prev) => mergeLots(prev, clean));

      setSelectedLotId((prev) => {
        const nextIds = new Set(clean.map((x) => String(x.id)));
        if (prev && nextIds.has(String(prev))) return prev;
        return clean[0]?.id ? String(clean[0].id) : "";
      });
    } catch (e: any) {
      console.error("fetchLots failed", e);
      toast({
        title: "Failed to load parking data",
        description: e?.message ?? "Could not fetch from database",
        duration: 2500,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchLots();
  }, [fetchLots]);

  // DB refresh (every minute by default)
  useEffect(() => {
    const ms =
      Number.isFinite(filters.refreshInterval) && filters.refreshInterval > 0
        ? filters.refreshInterval
        : 60_000;

    const id = window.setInterval(() => void fetchLots(), ms);
    return () => window.clearInterval(id);
  }, [fetchLots, filters.refreshInterval]);

  // Heuristic tick (moves every 15s)
  useEffect(() => {
    const id = window.setInterval(() => {
      setLotsState((prev) =>
        prev.map((lot) => {
          const src = (lot as any).estimateSource;
          const isHeuristicLot =
            src === "heuristic" || ((lot as any).hasLiveData !== true && src !== "virtual");
          if (!isHeuristicLot) return lot;

          const capacity = safeInt((lot as any).capacity ?? lot.total, 0);
          if (capacity <= 0) return lot;

          const lat = Number.isFinite(lot.coordinates?.lat) ? lot.coordinates!.lat : null;
          const lng = Number.isFinite(lot.coordinates?.lng) ? lot.coordinates!.lng : null;

          const now = new Date();
          const est = estimateOccupied(lot.id, lot.name ?? "", capacity, lat, lng, now);

          const occupied = clamp(est.occupied, 0, capacity);
          const free = clamp(capacity - occupied, 0, capacity);
          const status: ParkingStatus = (free / capacity) * 100 >= 30 ? STATUS_AVAILABLE : STATUS_BUSY;

          return {
            ...lot,
            occupied,
            free,
            status,
            confidence: est.confidence,
            conf: est.confidence,
            lastUpdated: now,
          };
        })
      );
    }, 15_000);

    return () => window.clearInterval(id);
  }, []);

  const refreshData = useCallback(async () => {
    await fetchLots();
    toast({
      title: "Data Refreshed",
      description: "Parking data updated from database",
      duration: 1500,
    });
  }, [fetchLots, toast]);

  const { searchTerm: filterTerm, meaningfulWords: filterWords } = useMemo(
    () => normalizeQueryToWords(filters.query),
    [filters.query]
  );

  const filteredLots = useMemo(() => {
    const ottawaBaseNames = new Set(
      lotsState.filter((l) => !!l.ottawa_lot_id).map((l) => normalizeLotName(l.name ?? ""))
    );

    return lotsState.filter((lot) => {
      const baseName = normalizeLotName(lot.name ?? "");
      const isCityParkingVariant = (lot.name ?? "").toLowerCase().includes("city parking");

      if (!lot.ottawa_lot_id && isCityParkingVariant && ottawaBaseNames.has(baseName)) {
        return false;
      }

      if (filters.onlyAvailable) {
        const { total, free } = getLotCounts(lot as any);
        if (!total || total <= 0) return false;
        if (free === null || free === undefined) return false;
        if (free <= 0) return false;
      }

      if (filterTerm) {
        if (filterWords.length === 0) return true;

        const searchableText = [lot.name, lot.address ?? "", ...(lot.amenities ?? [])]
          .join(" ")
          .toLowerCase();

        return filterWords.every((w) => searchableText.includes(w));
      }

      return true;
    });
  }, [lotsState, filters.onlyAvailable, filterTerm, filterWords]);

  const selectedLot = useMemo(() => {
    const lot = lotsState.find((x) => String(x.id) === String(selectedLotId));
    return lot ?? lotsState[0] ?? null;
  }, [lotsState, selectedLotId]);

  const updateFilters = (newFilters: Partial<ParkingFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...newFilters };
      if (newFilters.refreshInterval !== undefined) {
        const n = Number(newFilters.refreshInterval);
        next.refreshInterval = Number.isFinite(n) && n > 0 ? n : prev.refreshInterval;
      }
      return next;
    });
  };

  const selectLot = (lotId: string) => setSelectedLotId(lotId ? String(lotId) : "");
  const clearSelectedLot = () => setSelectedLotId("");

  const getAvailabilityPercentage = (lot: ParkingLot): number | null => {
    const { total, free } = getLotCounts(lot as any);
    if (!total || total <= 0) return null;
    if (free === null || free === undefined) return null;
    return Math.max(0, Math.min(100, Math.round((free / total) * 100)));
  };

  const searchLots = async (input: string) => {
    if (!input.trim()) return [];

    const { searchTerm, meaningfulWords } = normalizeQueryToWords(input);
    const addressCoords = parseAddressToCoordinates(searchTerm);

    let postalCoords: { lat: number; lng: number } | null = null;
    if (!addressCoords && isPostalCode(input)) {
      const postalInfo = parsePostalCodeToCoordinates(input);
      if (postalInfo) postalCoords = { lat: postalInfo.lat, lng: postalInfo.lng };
    }

    if (meaningfulWords.length === 0 && !addressCoords && !postalCoords) {
      return [...lotsState].sort((a, b) => {
        const fa = getLotCounts(a as any).free ?? -1;
        const fb = getLotCounts(b as any).free ?? -1;
        return fb - fa;
      });
    }

    let results = lotsState.filter((lot) => {
      const searchableText = [lot.name, lot.address ?? "", ...(lot.amenities ?? [])]
        .join(" ")
        .toLowerCase();

      const allWordsMatch =
        meaningfulWords.length > 0
          ? meaningfulWords.every((w) => searchableText.includes(w))
          : searchableText.includes(searchTerm);

      const partialMatches = [
        searchableText.includes(searchTerm),
        searchTerm.includes("downtown") && searchableText.includes("downtown"),
        searchTerm.includes("byward") && searchableText.includes("byward"),
        searchTerm.includes("market") && searchableText.includes("market"),
        searchTerm.includes("rideau") && searchableText.includes("rideau"),
        searchTerm.includes("sparks") && searchableText.includes("sparks"),
        searchTerm.includes("bank") && searchableText.includes("bank"),
        searchTerm.includes("somerset") && searchableText.includes("somerset"),
        searchTerm.includes("kent") && searchableText.includes("kent"),
        searchTerm.includes("lyon") && searchableText.includes("lyon"),
        searchTerm.includes("elgin") && searchableText.includes("elgin"),
      ].some(Boolean);

      return allWordsMatch || partialMatches;
    });

    const initialCoords = addressCoords || postalCoords;

    if (initialCoords) {
      return results
        .filter((lot) => Number.isFinite(lot.coordinates?.lat) && Number.isFinite(lot.coordinates?.lng))
        .map((lot) => ({
          ...lot,
          distanceKm: calculateDistance(
            initialCoords.lat,
            initialCoords.lng,
            lot.coordinates!.lat,
            lot.coordinates!.lng
          ),
        }))
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    if (results.length <= 2) {
      const geo = await geocodeOttawa(input);
      if (geo.found) {
        const coords = { lat: geo.lat, lng: geo.lng };
        return [...lotsState]
          .filter((lot) => Number.isFinite(lot.coordinates?.lat) && Number.isFinite(lot.coordinates?.lng))
          .map((lot) => ({
            ...lot,
            distanceKm: calculateDistance(coords.lat, coords.lng, lot.coordinates!.lat, lot.coordinates!.lng),
          }))
          .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      }
    }

    return results.sort((a, b) => {
      const fa = getLotCounts(a as any).free ?? -1;
      const fb = getLotCounts(b as any).free ?? -1;
      return fb - fa;
    });
  };

  // ✅ DEV ONLY: expose debug to browser console
if (import.meta.env.DEV) {
  (window as any).__PARKING_DEBUG__ = {
    ts: new Date().toISOString(),
    lots: lotsState,
    filteredLots,
    selectedLotId,
    selectedLot,
    filters,
    isLoading,
  };
}


  return {
    lots: filteredLots,
    allLots: lotsState,

    selectedLot,
    selectedLotId,

    filters,
    isLoading,

    updateFilters,
    selectLot,
    clearSelectedLot,

    refreshData,
    getAvailabilityPercentage,
    searchLots,
    getConfPct,
  };
};
