import { useState, useEffect, useCallback } from 'react';
import { ParkingLot, ParkingFilters } from '@/types/parking';
import { EXTENDED_PARKING_LOTS } from '@/data/parking-lots';
import { useToast } from '@/hooks/use-toast';
import { calculateDistance, parseAddressToCoordinates, parsePostalCodeToCoordinates, isPostalCode } from '@/utils/distance';

export const useParkingData = () => {
  // Hook for managing parking lot data and search functionality
  const [lots, setLots] = useState<ParkingLot[]>(EXTENDED_PARKING_LOTS);
  const [selectedLotId, setSelectedLotId] = useState<string>(EXTENDED_PARKING_LOTS[0].id);
  const [filters, setFilters] = useState<ParkingFilters>({
    query: '',
    onlyAvailable: false,
    refreshInterval: 15
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simulate random data updates to mimic live camera data
  const updateLotData = useCallback((lot: ParkingLot): ParkingLot => {
    const occupancyChange = Math.floor(Math.random() * 20) - 10; // ±10 change
    const newOccupied = Math.max(0, Math.min(lot.capacity, lot.occupied + occupancyChange));
    const availableRatio = (lot.capacity - newOccupied) / lot.capacity;
    const newStatus = availableRatio < 0.15 ? 'busy' : 'available';
    const confidenceChange = (Math.random() - 0.5) * 0.1; // ±5% confidence change
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
      setLots(prevLots => prevLots.map(updateLotData));
      setIsLoading(false);
      toast({
        title: "Data Refreshed",
        description: "Live parking data has been updated",
        duration: 2000,
      });
    }, 1000);
  }, [updateLotData, toast]);

  // Auto-refresh based on interval
  useEffect(() => {
    const interval = setInterval(refreshData, filters.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshData, filters.refreshInterval]);

  // Filter lots based on current filters
  const filteredLots = lots.filter(lot => {
    if (filters.onlyAvailable && lot.status !== 'available') return false;
    if (filters.query && !lot.name.toLowerCase().includes(filters.query.toLowerCase())) return false;
    return true;
  });

  const selectedLot = lots.find(lot => lot.id === selectedLotId) || lots[0];

  const updateFilters = (newFilters: Partial<ParkingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const selectLot = (lotId: string) => {
    setSelectedLotId(lotId);
  };

  const getAvailabilityPercentage = (lot: ParkingLot) => {
    return Math.round(((lot.capacity - lot.occupied) / lot.capacity) * 100);
  };

  const searchLots = (query: string) => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase().trim();
    const words = searchTerm.split(/\s+/);
    
    // Check if this looks like an address search or postal code
    const addressCoords = parseAddressToCoordinates(searchTerm);
    
    // Check if this is a postal code search
    let postalCoords = null;
    if (!addressCoords && isPostalCode(query)) {
      const postalInfo = parsePostalCodeToCoordinates(query);
      if (postalInfo) {
        postalCoords = { lat: postalInfo.lat, lng: postalInfo.lng };
      }
    }
    
    let results = EXTENDED_PARKING_LOTS.filter(lot => {
      const searchableText = [
        lot.name,
        lot.address,
        ...(lot.amenities || [])
      ].join(' ').toLowerCase();
      
      // Check if all words are found in the searchable text (more flexible matching)
      const allWordsMatch = words.every(word => searchableText.includes(word));
      
      // Also check for partial matches of streets, areas, or keywords
      const partialMatches = [
        lot.name.toLowerCase().includes(searchTerm),
        lot.address.toLowerCase().includes(searchTerm),
        lot.amenities?.some(amenity => amenity.toLowerCase().includes(searchTerm)),
        // Add common Ottawa area matching
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

    // If we found coordinates (address or postal code), calculate distances and sort by proximity
    const searchCoords = addressCoords || postalCoords;
    if (searchCoords) {
      results = results.map(lot => ({
        ...lot,
        distanceKm: calculateDistance(
          searchCoords.lat,
          searchCoords.lng,
          lot.coordinates.lat,
          lot.coordinates.lng
        )
      })).sort((a, b) => {
        // Sort by distance first, then by availability
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        const aAvailable = a.capacity - a.occupied;
        const bAvailable = b.capacity - b.occupied;
        return bAvailable - aAvailable;
      });
    } else {
      // Regular sorting without distance
      results = results.sort((a, b) => {
        // Prioritize exact name matches
        if (a.name.toLowerCase().includes(searchTerm) && !b.name.toLowerCase().includes(searchTerm)) {
          return -1;
        }
        if (b.name.toLowerCase().includes(searchTerm) && !a.name.toLowerCase().includes(searchTerm)) {
          return 1;
        }
        
        // Then prioritize by availability
        const aAvailable = a.capacity - a.occupied;
        const bAvailable = b.capacity - b.occupied;
        return bAvailable - aAvailable;
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