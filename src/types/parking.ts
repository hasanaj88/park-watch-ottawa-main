export interface ParkingLot {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  status: 'available' | 'busy';
  confidence: number;
  camThumb?: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  pricing: {
    rate: string;
    maxStay: string;
    openUntil: string;
  };
  amenities?: string[];
  lastUpdated: Date;
  distanceKm?: number; // Optional distance in kilometers for search results
}

export interface ParkingFilters {
  query: string;
  onlyAvailable: boolean;
  refreshInterval: number;
}

export interface MapPin {
  id: string;
  position: {
    x: number;
    y: number;
  };
  lot: ParkingLot;
}