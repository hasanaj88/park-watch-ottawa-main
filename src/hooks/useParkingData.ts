import { useState, useEffect, useCallback, useMemo } from 'react';
import { ParkingLot, ParkingFilters } from '@/types/parking';
import { EXTENDED_PARKING_LOTS } from '@/data/parking-lots';
import { useToast } from '@/hooks/use-toast';
import {
  calculateDistance,
  parseAddressToCoordinates,
  parsePostalCodeToCoordinates,
  isPostalCode
} from '@/utils/distance';

export const useParkingData = () => {
  const [lots, setLots] = useState<ParkingLot[]>(EXTENDED_PARKING_LOTS);
  const [selectedLotId, setSelectedLotId] = useState<string>(EXTENDED_PARKING_LOTS[0]?.id ?? '');
  const [filters, setFilters] = useState<ParkingFilters>({
    query: '',
    onlyAvailable: false,
    refreshInterval: 15
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simulate random data updates to mimic live camera data
  const updateLotData = useCallback((lot: ParkingLot): ParkingLot => {
    const occupancyChange = Math.floor(Math.random() * 20) - 10; // ±10
    const newOccupied = Math.max(0, Math.min(lot.capacity, lot.occupied + occupancyChange));
    const availableRatio = (lot.capacity - newOccupied) / lot.capacity;
    const newStatus = availableRatio < 0.15 ? 'busy' : 'available';
    const confidenceChange = (Math.random() - 0.5) * 0.1; // ±5%
    const newConfidence = Math.max(0.4, Math.min(0.99, lot.confidence + confidenceChange));

    return {
      ...lot,
      occupied: newOccupied,
      status: newStatus,
      confidence: newConfidence,
      lastUpdated: new Date()
    };
  }, []);

  // Simulate live data refresh
  const refreshData = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setLots(prev => prev.map(updateLotData));
      setIsLoading(false);
      toast({
        title: 'Data Refreshed',
        description: 'Live parking data has been updated',
        duration: 2000
      });
    }, 1000);
  }, [updateLotData, toast]);

  // Auto-refresh based on interval
  useEffect(() => {
    const interval = setInterval(refreshData, filters.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshData, filters.refreshInterval]);

  // Filter lots based on current filters (local search)
  const filterQuery = filters.query.toLowerCase().trim();

  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      if (filters.onlyAvailable && lot.status !== 'available') return false;

      if (filterQuery) {
        const searchableText = [
          lot.name,
          lot.address,
          ...(lot.amenities || [])
        ].join(' ').toLowerCase();

        if (!searchableText.includes(filterQuery)) return false;
      }

      return true;
    });
  }, [lots, filters.onlyAvailable, filterQuery]);

  // Safer selected lot
  const selectedLot =
    lots.find(lot => lot.id === selectedLotId) ??
    lots[0] ??
    null;

  const updateFilters = (newFilters: Partial<ParkingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const selectLot = (lotId: string) => {
    setSelectedLotId(lotId);
  };

  const getAvailabilityPercentage = (lot: ParkingLot) => {
    return Math.round(((lot.capacity - lot.occupied) / lot.capacity) * 100);
  };

  // Location-style search (address/postal/distance). Uses LIVE lots now.
  const searchLots = (input: string) => {
    if (!input.trim()) return [];

    const searchTerm = input.toLowerCase().trim();
    const words = searchTerm.split(/\s+/);

    // Address lookup
    const addressCoords = parseAddressToCoordinates(searchTerm);

    // Postal lookup
    let postalCoords: { lat: number; lng: number } | null = null;
    if (!addressCoords && isPostalCode(input)) {
      const postalInfo = parsePostalCodeToCoordinates(input);
      if (postalInfo) postalCoords = { lat: postalInfo.lat, lng: postalInfo.lng };
    }

    let results = lots.filter(lot => {
      const searchableText = [
        lot.name,
        lot.address,
        ...(lot.amenities || [])
      ].join(' ').toLowerCase();

      const allWordsMatch = words.every(word => searchableText.includes(word));

      const partialMatches = [
        lot.name.toLowerCase().includes(searchTerm),
        lot.address.toLowerCase().includes(searchTerm),
        lot.amenities?.some(a => a.toLowerCase().includes(searchTerm)),
        // Ottawa area keywords
        searchTerm.includes('downtown') && lot.address.toLowerCase().includes('downtown'),
        searchTerm.includes('byward') && lot.address.toLowerCase().includes('byward'),
        searchTerm.includes('market') && lot.address.toLowerCase().includes('market'),
        searchTerm.includes('rideau') && lot.address.toLowerCase().includes('rideau'),
        searchTerm.includes('sparks') && lot.address.toLowerCase().includes('sparks'),
        searchTerm.includes('bank') && lot.address.toLowerCase().includes('bank'),
        searchTerm.includes('somerset') && lot.address.toLowerCase().includes('somerset'),
        searchTerm.includes('kent') && lot.address.toLowerCase().includes('kent'),
        searchTerm.includes('lyon') && lot.address.toLowerCase().includes('lyon'),
        searchTerm.includes('elgin') && lot.address.toLowerCase().includes('elgin')
      ].some(Boolean);

      return allWordsMatch || partialMatches;
    });

    const searchCoords = addressCoords || postalCoords;

    if (searchCoords) {
      results = results
        .map(lot => ({
          ...lot,
          distanceKm: calculateDistance(
            searchCoords.lat,
            searchCoords.lng,
            lot.coordinates.lat,
            lot.coordinates.lng
          )
        }))
        .sort((a, b) => {
          if ((a.distanceKm ?? 0) !== (b.distanceKm ?? 0)) {
            return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
          }
          const aAvail = a.capacity - a.occupied;
          const bAvail = b.capacity - b.occupied;
          return bAvail - aAvail;
        });
    } else {
      results = results.sort((a, b) => {
        const aNameHit = a.name.toLowerCase().includes(searchTerm);
        const bNameHit = b.name.toLowerCase().includes(searchTerm);
        if (aNameHit && !bNameHit) return -1;
        if (bNameHit && !aNameHit) return 1;

        const aAvail = a.capacity - a.occupied;
        const bAvail = b.capacity - b.occupied;
        return bAvail - aAvail;
      });
    }

    return results;
  };

  return {
    lots: filteredLots,
    allLots: lots,
    selectedLot,
    selectedLotId,
    filters,
    isLoading,
    updateFilters,
    selectLot,
    refreshData,
    getAvailabilityPercentage,
    searchLots
  };
};
