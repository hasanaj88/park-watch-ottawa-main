export type ParkingStatus = "available" | "busy";

export interface ParkingCoordinates {
  lat: number;
  lng: number;
}

export interface ParkingPricing {
  rate: string;
  maxStay: string;
  openUntil: string;
}

export interface ParkingLot {
  id: string;
  name: string;

  // Legacy/required UI fields
  capacity: number;
  occupied: number;
  status: ParkingStatus;

  confidence: number;

  address: string;
  coordinates: ParkingCoordinates;

  pricing: ParkingPricing;
  amenities?: string[];

  lastUpdated: Date;
  distanceKm?: number;

  // Supabase-compatible aliases (optional)
  total?: number;
  free?: number;
  conf?: number;
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

