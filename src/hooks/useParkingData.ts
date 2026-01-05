import { useState, useEffect, useCallback, useMemo } from "react";
import type { ParkingLot, ParkingFilters } from "@/types/parking";
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

type DbParkingLot = {
  id: string;
  ottawa_lot_id?: string | null;
  name: string;
  capacity: number | null;

  api_available: number | null;
  api_occupied: number | null;
  virtual_occupied: number | null;
  api_status: string | null;

  lat: number | null;
  lng: number | null;
  created_at?: string | null;
};

const toUiStatus = (s: string | null | undefined): ParkingLot["status"] => {
  const x = String(s ?? "").toLowerCase().trim();

  if (x === "available" || x === "open") return "available";
  if (x === "full" || x === "occupied") return "occupied";
  if (x === "busy" || x === "closed") return "busy";

  return "busy";
};

export function getConfPct(lot: ParkingLot) {
  const conf = safeNum((lot as any).conf ?? (lot as any).confidence, 0);
  const pct = conf > 1 ? conf : conf * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type ParkingLotWithExtras = ParkingLot & {
  total?: number;
  free?: number | null;
  conf?: number;
  hasLiveData?: boolean;
  ottawa_lot_id?: string | null;
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

  const hasLiveData =
    apiAvailable !== null ||
    apiOccupied !== null ||
    row.api_status !== null ||
    (virtualOccupied !== null && virtualOccupied > 0);

  let free = 0;
  let occupied = 0;

  if (hasLiveData && capacity > 0) {
    if (apiAvailable !== null) {
      free = clamp(apiAvailable, 0, capacity);
      occupied =
        apiOccupied !== null ? clamp(apiOccupied, 0, capacity) : clamp(capacity - free, 0, capacity);
    } else if (apiOccupied !== null) {
      occupied = clamp(apiOccupied, 0, capacity);
      free = clamp(capacity - occupied, 0, capacity);
    } else if (virtualOccupied !== null) {
      occupied = clamp(virtualOccupied, 0, capacity);
      free = clamp(capacity - occupied, 0, capacity);
    }
  }

  const status: ParkingLot["status"] = hasLiveData
    ? row.api_status
      ? toUiStatus(row.api_status)
      : free > 0
        ? "available"
        : "occupied"
    : "busy";

  const lat = typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null;
  const lng = typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null;

  return {
    id: row.id,
    ottawa_lot_id: row.ottawa_lot_id ?? null,
    name: row.name,

    capacity,
    occupied,

    total: capacity,
    free: hasLiveData ? free : null,

    status,

    confidence: hasLiveData ? 0.9 : 0.3,
    conf: hasLiveData ? 0.9 : 0.3,

    address: "",
    amenities: [],
    pricing: { rate: "—", maxStay: "—", openUntil: "—" },

    coordinates: {
      lat: lat ?? 0,
      lng: lng ?? 0,
    },

    lastUpdated: row.created_at ? new Date(row.created_at) : new Date(),
    hasLiveData,
  };
};

export const useParkingData = () => {
  const [lotsState, setLotsState] = useState<ParkingLotWithExtras[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>("");

  const [filters, setFilters] = useState<ParkingFilters>({
    query: "",
    onlyAvailable: false,
    refreshInterval: 60_000,
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLots = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("parking_lots")
        .select(
          "id,ottawa_lot_id,name,capacity,api_available,api_occupied,virtual_occupied,api_status,lat,lng,created_at"
        )
        .order("name", { ascending: true });

      if (error) throw error;

      const rows = Array.isArray(data) ? (data as DbParkingLot[]) : [];
      const mapped = rows.filter((r) => r && r.id && r.name).map(mapDbLotToParkingLot);

      setLotsState(mapped);

      setSelectedLotId((prev) => {
        if (prev && mapped.some((x) => String(x.id) === String(prev))) return prev;
        return mapped[0]?.id ? String(mapped[0].id) : "";
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

  useEffect(() => {
    const ms =
      Number.isFinite(filters.refreshInterval) && filters.refreshInterval > 0
        ? filters.refreshInterval
        : 60_000;

    const id = window.setInterval(() => void fetchLots(), ms);
    return () => window.clearInterval(id);
  }, [fetchLots, filters.refreshInterval]);

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
      lotsState
        .filter((l) => !!l.ottawa_lot_id)
        .map((l) => normalizeLotName(l.name))
    );

    return lotsState.filter((lot) => {
      const baseName = normalizeLotName(lot.name);
      const isCityParkingVariant = lot.name.toLowerCase().includes("city parking");

      if (!lot.ottawa_lot_id && isCityParkingVariant && ottawaBaseNames.has(baseName)) {
        return false;
      }

      if (filters.onlyAvailable && lot.status !== "available") return false;

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

  const getAvailabilityPercentage = (lot: ParkingLot) => {
    const { total, free } = getLotCounts(lot);
    if (total <= 0) return 0;
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
      return [...lotsState].sort((a, b) => getLotCounts(b).free - getLotCounts(a).free);
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
            lot.coordinates.lat,
            lot.coordinates.lng
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
            distanceKm: calculateDistance(coords.lat, coords.lng, lot.coordinates.lat, lot.coordinates.lng),
          }))
          .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      }
    }

    return results.sort((a, b) => {
      const aNameHit = a.name.toLowerCase().includes(searchTerm);
      const bNameHit = b.name.toLowerCase().includes(searchTerm);
      if (aNameHit && !bNameHit) return -1;
      if (bNameHit && !aNameHit) return 1;
      return getLotCounts(b).free - getLotCounts(a).free;
    });
  };

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
