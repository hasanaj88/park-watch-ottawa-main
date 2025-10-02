import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ParkingLot } from '@/types/parking';
import { MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

interface ParkingListProps {
  lots: ParkingLot[];
  selectedLotId: string;
  onLotSelect: (lotId: string) => void;
  getAvailabilityPercentage: (lot: ParkingLot) => number;
}

export const ParkingList = ({ 
  lots, 
  selectedLotId, 
  onLotSelect,
  getAvailabilityPercentage 
}: ParkingListProps) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Nearby Parking Lots</h3>
      <div className="max-h-[50vh] overflow-y-auto space-y-3">
        {lots.map((lot) => {
          const availableSpots = lot.capacity - lot.occupied;
          const availabilityPercentage = getAvailabilityPercentage(lot);
          const isSelected = lot.id === selectedLotId;
          const StatusIcon = lot.status === 'available' ? CheckCircle : AlertTriangle;

          return (
            <button
              key={lot.id}
              onClick={() => onLotSelect(lot.id)}
              className={`
                w-full p-4 rounded-xl border bg-card text-left
                transition-all duration-200 hover:shadow-md hover:scale-[1.02]
                ${isSelected ? 'ring-2 ring-parking-ring bg-parking-ring/5' : ''}
              `}
            >
              <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                {/* Status Indicator */}
                <div className="flex flex-col items-center gap-1">
                  <StatusIcon 
                    className={`
                      h-4 w-4 
                      ${lot.status === 'available' ? 'text-parking-available' : 'text-parking-busy'}
                    `} 
                  />
                  <div 
                    className={`
                      w-2 h-2 rounded-full
                      ${lot.status === 'available' ? 'status-dot-available' : 'status-dot-busy'}
                    `} 
                  />
                </div>

                {/* Lot Information */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{lot.name}</h4>
                    <Badge 
                      variant={lot.status === 'available' ? 'default' : 'destructive'}
                      className={`
                        text-xs px-2 py-0.5
                        ${lot.status === 'available' ? 'status-available' : 'status-busy'}
                      `}
                    >
                      {availabilityPercentage}%
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-1">
                    {availableSpots} free • {lot.capacity} total
                  </p>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{lot.address}</span>
                  </div>

                  {/* Pricing Info */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{lot.pricing.rate}</span>
                    <span>•</span>
                    <span>Max: {lot.pricing.maxStay}</span>
                    <span>•</span>
                    <span>Until: {lot.pricing.openUntil}</span>
                  </div>

                  {/* Amenities */}
                  {lot.amenities && lot.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lot.amenities.slice(0, 3).map((amenity, index) => (
                        <span 
                          key={index} 
                          className="text-xs px-2 py-0.5 bg-muted rounded-md"
                        >
                          {amenity}
                        </span>
                      ))}
                      {lot.amenities.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{lot.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Availability Display */}
                <div className="flex flex-col items-center gap-2">
                  <div className="text-center">
                    <div className="text-sm font-semibold">
                      {availabilityPercentage}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      available
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {lots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No parking lots match your search criteria.</p>
          </div>
        )}
      </div>
    </Card>
  );
};