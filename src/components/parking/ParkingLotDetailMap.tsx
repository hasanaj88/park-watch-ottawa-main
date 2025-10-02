import { Card } from '@/components/ui/card';
import { ParkingLot } from '@/types/parking';
import { Badge } from '@/components/ui/badge';
import { Car, MapPin } from 'lucide-react';

interface ParkingSpace {
  id: string;
  isOccupied: boolean;
  type: 'standard' | 'disabled' | 'electric' | 'compact';
}

interface ParkingLotDetailMapProps {
  lot: ParkingLot;
}

// Generate parking spaces layout for visualization
const generateParkingSpaces = (lot: ParkingLot): ParkingSpace[] => {
  const spaces: ParkingSpace[] = [];
  const types: ('standard' | 'disabled' | 'electric' | 'compact')[] = ['standard', 'disabled', 'electric', 'compact'];
  
  for (let i = 0; i < lot.capacity; i++) {
    const isOccupied = i < lot.occupied;
    const type = i === 0 ? 'disabled' : 
                 i === 1 || i === 2 ? 'electric' : 
                 i % 8 === 0 ? 'compact' : 'standard';
    
    spaces.push({
      id: `space-${i}`,
      isOccupied,
      type
    });
  }
  
  return spaces;
};

const getSpaceTypeColor = (type: ParkingSpace['type'], isOccupied: boolean) => {
  if (isOccupied) return 'bg-red-500/80 border-red-600';
  
  switch (type) {
    case 'disabled':
      return 'bg-blue-500/80 border-blue-600';
    case 'electric':
      return 'bg-yellow-500/80 border-yellow-600';
    case 'compact':
      return 'bg-purple-500/80 border-purple-600';
    default:
      return 'bg-green-500/80 border-green-600';
  }
};

const getSpaceTypeIcon = (type: ParkingSpace['type']) => {
  switch (type) {
    case 'disabled':
      return '♿';
    case 'electric':
      return '⚡';
    case 'compact':
      return 'C';
    default:
      return '';
  }
};

export const ParkingLotDetailMap = ({ lot }: ParkingLotDetailMapProps) => {
  const spaces = generateParkingSpaces(lot);
  const availableSpaces = spaces.filter(space => !space.isOccupied).length;
  
  // Calculate grid layout - aim for roughly rectangular layout
  const totalSpaces = spaces.length;
  const cols = Math.ceil(Math.sqrt(totalSpaces * 1.5)); // Slightly wider than square
  const rows = Math.ceil(totalSpaces / cols);

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{lot.name}</h3>
            <p className="text-sm text-muted-foreground">Detailed Parking Layout</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {availableSpaces}
          </div>
          <div className="text-xs text-muted-foreground">available</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500/80 border border-green-600 rounded"></div>
          <span className="text-xs">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500/80 border border-red-600 rounded"></div>
          <span className="text-xs">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500/80 border border-blue-600 rounded"></div>
          <span className="text-xs">Disabled ♿</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500/80 border border-yellow-600 rounded"></div>
          <span className="text-xs">Electric ⚡</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500/80 border border-purple-600 rounded"></div>
          <span className="text-xs">Compact</span>
        </div>
      </div>

      {/* Parking Spaces Grid */}
      <div 
        className="grid gap-2 p-6 bg-gray-200/30 dark:bg-slate-700/30 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 relative"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
        }}
      >
        {/* Road markings background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 0%, transparent 45%, #666 45%, #666 55%, transparent 55%, transparent 100%),
              linear-gradient(0deg, transparent 0%, transparent 45%, #666 45%, #666 55%, transparent 55%, transparent 100%)
            `,
            backgroundSize: `${100/cols}% ${100/rows}%`
          }}></div>
        </div>

        {spaces.map((space, index) => (
          <div
            key={space.id}
            className={`
              relative h-12 rounded-md border-2 transition-all duration-200 hover:scale-105 cursor-pointer
              flex items-center justify-center text-xs font-semibold text-white shadow-sm
              ${getSpaceTypeColor(space.type, space.isOccupied)}
            `}
            title={`Space ${index + 1} - ${space.type} ${space.isOccupied ? '(Occupied)' : '(Available)'}`}
          >
            {/* Space number */}
            <span className="absolute top-0.5 left-1 text-[10px] opacity-75">
              {index + 1}
            </span>
            
            {/* Type icon */}
            <span className="text-lg">
              {space.isOccupied ? <Car className="h-3 w-3" /> : getSpaceTypeIcon(space.type)}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-lg font-bold text-green-600">{availableSpaces}</div>
          <div className="text-xs text-muted-foreground">Available</div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-lg font-bold text-red-600">{lot.occupied}</div>
          <div className="text-xs text-muted-foreground">Occupied</div>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-lg font-bold text-blue-600">{lot.capacity}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="text-lg font-bold text-amber-600">{Math.round((availableSpaces / lot.capacity) * 100)}%</div>
          <div className="text-xs text-muted-foreground">Free</div>
        </div>
      </div>
    </Card>
  );
};