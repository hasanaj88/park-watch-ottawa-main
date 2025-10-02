import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Clock, DollarSign, Car, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { ParkingLot } from '@/types/parking';

interface ParkingDetailProps {
  lot: ParkingLot;
  availabilityPercentage: number;
  onNavigate: (lot: ParkingLot) => void;
}

export const ParkingDetail = ({ lot, availabilityPercentage, onNavigate }: ParkingDetailProps) => {
  const availableSpots = lot.capacity - lot.occupied;
  const statusIcon = lot.status === 'available' ? CheckCircle : AlertTriangle;
  const StatusIcon = statusIcon;

  const handleNavigate = () => {
    onNavigate(lot);
  };

  return (
    <Card className="p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">{lot.name}</h2>
          <p className="text-sm text-muted-foreground mb-2">ID: {lot.id}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {lot.address}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={lot.status === 'available' ? 'default' : 'destructive'}
            className={`gap-1 ${lot.status === 'available' ? 'status-available' : 'status-busy'}`}
          >
            <StatusIcon className="h-3 w-3" />
            {lot.status === 'available' ? 'Available' : 'Busy'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            conf {Math.round(lot.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Availability Gauge */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 36 36" className="w-16 h-16">
            <path
              stroke="hsl(var(--muted))"
              strokeWidth="3.5"
              fill="none"
              d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
            />
            <path
              stroke="hsl(var(--parking-ring))"
              strokeWidth="3.5"
              fill="none"
              strokeDasharray={`${availabilityPercentage}, 100`}
              d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold">{availabilityPercentage}%</span>
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold mb-1">
            {availableSpots} free / {lot.capacity}
          </div>
          <p className="text-sm text-muted-foreground">
            Occupied: {lot.occupied} spaces
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <span className="text-sm text-muted-foreground">Max Stay</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <strong className="text-sm">{lot.pricing.maxStay}</strong>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <span className="text-sm text-muted-foreground">Rate</span>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <strong className="text-sm">{lot.pricing.rate}</strong>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <span className="text-sm text-muted-foreground">Open Until</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <strong className="text-sm">{lot.pricing.openUntil}</strong>
          </div>
        </div>
      </div>

      {/* Amenities */}
      {lot.amenities && lot.amenities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {lot.amenities.map((amenity, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={handleNavigate} className="gap-2 flex-1">
          <Navigation className="h-4 w-4" />
          Navigate with Google Maps
        </Button>
      </div>

      {/* Last Updated */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Last updated: {lot.lastUpdated.toLocaleTimeString()}
        </p>
      </div>
    </Card>
  );
};