import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ParkingLot } from '@/types/parking';
import { Search, MapPin, Navigation, Clock, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

interface SearchResultsProps {
  onSearch: (query: string) => ParkingLot[];
  onLotSelect: (lotId: string) => void;
  onNavigate: (lot: ParkingLot) => void;
}

export const SearchResults = ({ onSearch, onLotSelect, onNavigate }: SearchResultsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ParkingLot[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const results = onSearch(searchQuery);
      setTimeout(() => {
        setSearchResults(results);
        setIsSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, onSearch]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const getAvailabilityPercentage = (lot: ParkingLot) => {
    return Math.round(((lot.capacity - lot.occupied) / lot.capacity) * 100);
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Search Parking Locations</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter address or location (e.g., '819 Dynes Rd', 'Downtown Ottawa', 'ByWard Market')..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {!searchQuery && (
          <div className="mt-3 text-xs text-muted-foreground">
            <p className="mb-1">Find nearest parking by address:</p>
            <div className="flex flex-wrap gap-1">
              {['819 Dynes Rd', 'Parliament Hill', 'University of Ottawa', 'Rideau Centre', 'Lansdowne Park'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSearch(suggestion)}
                  className="px-2 py-1 bg-muted rounded-md hover:bg-muted/80 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isSearching && (
        <div className="text-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-parking-ring border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Searching parking locations...</p>
        </div>
      )}

      {!isSearching && searchQuery && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium mb-1">No results found</p>
          <p className="text-sm">Try searching for a different location or amenity</p>
        </div>
      )}

      {!isSearching && searchResults.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {searchResults.length} parking location{searchResults.length !== 1 ? 's' : ''}
            {searchResults[0]?.distanceKm && (
              <span className="ml-2 font-medium">
                • Sorted by distance from your location
              </span>
            )}
          </p>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {searchResults.map((lot) => {
              const availableSpots = lot.capacity - lot.occupied;
              const availabilityPercentage = getAvailabilityPercentage(lot);
              const StatusIcon = lot.status === 'available' ? CheckCircle : AlertTriangle;

              return (
                <Card key={lot.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{lot.name}</h3>
                        <Badge 
                          variant={lot.status === 'available' ? 'default' : 'destructive'}
                          className={`gap-1 ${lot.status === 'available' ? 'status-available' : 'status-busy'}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {lot.status === 'available' ? 'Available' : 'Busy'}
                        </Badge>
                        {lot.distanceKm && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {lot.distanceKm} km
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{lot.address}</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>{lot.pricing.rate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Max: {lot.pricing.maxStay}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Until: {lot.pricing.openUntil}</span>
                        </div>
                      </div>

                      {lot.amenities && lot.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {lot.amenities.slice(0, 4).map((amenity, index) => (
                            <span 
                              key={index} 
                              className="text-xs px-2 py-1 bg-muted rounded-md"
                            >
                              {amenity}
                            </span>
                          ))}
                          {lot.amenities.length > 4 && (
                            <span className="text-xs text-muted-foreground py-1">
                              +{lot.amenities.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-center ml-4">
                      <div className="text-lg font-bold mb-1">
                        {availabilityPercentage}%
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        available
                      </div>
                      <div className="text-sm">
                        {availableSpots} / {lot.capacity}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => onLotSelect(lot.id)}
                      className="flex-1"
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => onNavigate(lot)}
                      className="gap-2"
                    >
                      <Navigation className="h-3 w-3" />
                      Navigate
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!searchQuery && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium mb-1">Find Nearest Parking</p>
          <p className="text-sm mb-3">Enter an address to find the closest parking locations with distances</p>
          <p className="text-xs">Example: "819 Dynes Rd" or "Parliament Hill"</p>
        </div>
      )}
    </Card>
  );
};