// src/types/parking.ts

//  status type
export type ParkingStatus = "available" | "busy";

// coordinates
export interface ParkingCoordinates {
  lat: number;
  lng: number;
}

// pricing
export interface ParkingPricing {
  rate: string;
  maxStay: string;
  openUntil: string;
}

/**
 * Unified lot shape used across:
 * - parking_app_view (map_capacity/map_available/map_data_mode/...)
 * - legacy parking_lots table (capacity/available/...)
 * - computed/virtual lots (free/occupied calculated locally)
 */
export interface ParkingLot {
  lot: any; // raw row

  id: string;
  name: string;

  // ---- Capacity / counts ----
  capacity?: number;
  total?: number;
  free?: number | null;
  occupied?: number | null;

  // ---- Status / confidence ----
  status?: ParkingStatus;
  confidence?: number;
  conf?: number;

  // ---- UI meta ----
  address?: string;
  coordinates?: ParkingCoordinates;

  pricing?: ParkingPricing;
  amenities?: string[];

  lastUpdated?: Date;
  distanceKm?: number;

  // ---- parking_app_view fields ----
  map_capacity?: number | null;
  map_available?: number | null;
  map_status?: string | null;
  map_updated_at?: string | Date | null;
  map_data_mode?: string | null; // ✅ مهم

  // ---- extras ----
  hasLiveData?: boolean;
  estimateSource?: "live" | "virtual" | "heuristic";
  ottawa_lot_id?: string | null;
}


export interface ParkingFilters {
  query: string;
  onlyAvailable: boolean;
  refreshInterval: number;
}

export interface MapPin {
  id: string;
  position: { x: number; y: number };
  lot: ParkingLot;
}
