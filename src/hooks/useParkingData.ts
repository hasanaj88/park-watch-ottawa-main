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
import { geocodeOttawa } from '@/utils/geocode';

const STOPWORDS = new Set([
  'parking', 'park', 'lot', 'lots', 'garage', 'garages', 'parkade', 'parkades',
  'location', 'locations', 'spot', 'spots', 'near', 'nearest', 'find', 'show', 'me'
]);

const normalizeWord = (w: string) => {
  const x = w.toLowerCase().trim();
  if (!x) return '';
  if (x.length > 3 && x.endsWith('s')) return x.slice(0, -1);
  return x;
};

const normalizeQueryToWords = (q: string) => {
  const searchTerm = q.toLowerCase().trim();
  const rawWords = searchTerm.split(/\s+/).map(normalizeWord);
  const meaningfulWords = rawWords.filter(w => w && !STOPWORDS.has(w));
  return { searchTerm, meaningfulWords };
};

export const useParkingData = () => {
  const [lotsState, setLotsState] = useState<ParkingLot[]>(EXTENDED_PARKING_LOTS);

  // ✅ IMPORTANT: start with no selected lot
  const [selectedLotId, setSelectedLotId] = useState<string>('');

  const [filters, setFilters] = useState<ParkingFilters>({
    query: '',
    onlyAvailable: false,
    refreshInterval: 15
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const updateLotData = useCallback((lot: ParkingLot): ParkingLot => {
    const occupancyChange = Math.floor(Math.random() * 20) - 10;
    const newOccupied = Math.max(0, Math.min(lot.capacity, lot.occupied + occupancyChange));
    const availableRatio = (lot.capacity - newOccupied) / lot.capacity;
    const newStatus = availableRatio < 0.15 ? 'busy' : 'available';
    const confidenceChange = (Math.random() - 0.5) * 0.1;
    const newConfidence = Math.max(0.4, Math.min(0.99, lot.confidence + confidenceChange));

    return {
      ...lot,
      occupied: newOccupied,
      status: newStatus,
      confidence: newConfidence,
      lastUpdated: new Date()
    };
  }, []);

  const refreshData = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setLotsState(prev => prev.map(updateLotData));
      setIsLoading(false);
      toast({
        title: 'Data Refreshed',
        description: 'Live parking data has been updated',
        duration: 2000
      });
    }, 1000);
  }, [updateLotData, toast]);

  useEffect(() => {
    const interval = setInterval(refreshData, filters.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshData, filters.refreshInterval]);

  const { searchTerm: filterTerm, meaningfulWords: filterWords } = useMemo(
    () => normalizeQueryToWords(filters.query),
    [filters.query]
  );

  const filteredLots = useMemo(() => {
    return lotsState.filter(lot => {
      if (filters.onlyAvailable && lot.status !== 'available') return false;

      if (filterTerm) {
        if (filterWords.length === 0) return true;

        const searchableText = [
          lot.name,
          lot.address ?? '',
          ...(lot.amenities || [])
        ].join(' ').toLowerCase();

        return filterWords.every(w => searchableText.includes(w));
      }

      return true;
    });
  }, [lotsState, filters.onlyAvailable, filterTerm, filterWords]);

  // ✅ Selected lot: null if no id
  const selectedLot = useMemo(() => {
    if (!selectedLotId) return null;
    return lotsState.find(lot => lot.id === selectedLotId) ?? null;
  }, [lotsState, selectedLotId]);

  const updateFilters = (newFilters: Partial<ParkingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const selectLot = (lotId: string) => {
    setSelectedLotId(lotId ? String(lotId) : '');
  };

  const clearSelectedLot = () => {
    setSelectedLotId('');
  };

  const getAvailabilityPercentage = (lot: ParkingLot) => {
    return Math.round(((lot.capacity - lot.occupied) / lot.capacity) * 100);
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
      return [...lotsState].sort(
        (a, b) => (b.capacity - b.occupied) - (a.capacity - a.occupied)
      );
    }

    let results = lotsState.filter(lot => {
      const searchableText = [
        lot.name,
        lot.address ?? '',
        ...(lot.amenities || [])
      ].join(' ').toLowerCase();

      const allWordsMatch =
        meaningfulWords.length > 0
          ? meaningfulWords.every(w => searchableText.includes(w))
          : searchableText.includes(searchTerm);

      const partialMatches = [
        searchableText.includes(searchTerm),
        searchTerm.includes('downtown') && searchableText.includes('downtown'),
        searchTerm.includes('byward') && searchableText.includes('byward'),
        searchTerm.includes('market') && searchableText.includes('market'),
        searchTerm.includes('rideau') && searchableText.includes('rideau'),
        searchTerm.includes('sparks') && searchableText.includes('sparks'),
        searchTerm.includes('bank') && searchableText.includes('bank'),
        searchTerm.includes('somerset') && searchableText.includes('somerset'),
        searchTerm.includes('kent') && searchableText.includes('kent'),
        searchTerm.includes('lyon') && searchableText.includes('lyon'),
        searchTerm.includes('elgin') && searchableText.includes('elgin')
      ].some(Boolean);

      return allWordsMatch || partialMatches;
    });

    const initialCoords = addressCoords || postalCoords;
    if (initialCoords) {
      return results
        .map(lot => ({
          ...lot,
          distanceKm: calculateDistance(
            initialCoords.lat,
            initialCoords.lng,
            lot.coordinates.lat,
            lot.coordinates.lng
          )
        }))
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    if (results.length <= 2) {
      const geo = await geocodeOttawa(input);
      if (geo.found) {
        const coords = { lat: geo.lat, lng: geo.lng };
        return [...lotsState]
          .map(lot => ({
            ...lot,
            distanceKm: calculateDistance(
              coords.lat,
              coords.lng,
              lot.coordinates.lat,
              lot.coordinates.lng
            )
          }))
          .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      }
    }

    return results.sort((a, b) => {
      const aNameHit = a.name.toLowerCase().includes(searchTerm);
      const bNameHit = b.name.toLowerCase().includes(searchTerm);
      if (aNameHit && !bNameHit) return -1;
      if (bNameHit && !aNameHit) return 1;

      const aAvail = a.capacity - a.occupied;
      const bAvail = b.capacity - b.occupied;
      return bAvail - aAvail;
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
    searchLots
  };
};
