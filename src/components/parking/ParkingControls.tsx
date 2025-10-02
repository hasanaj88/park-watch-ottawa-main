import { Search, Filter, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { ParkingFilters } from '@/types/parking';

interface ParkingControlsProps {
  filters: ParkingFilters;
  onFiltersChange: (filters: Partial<ParkingFilters>) => void;
  onSearch: (query: string) => void;
}

export const ParkingControls = ({ filters, onFiltersChange, onSearch }: ParkingControlsProps) => {
  return (
    <Card className="p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parking lots..."
            value={filters.query}
            onChange={(e) => {
              const query = e.target.value;
              onFiltersChange({ query });
              onSearch(query);
            }}
            className="pl-10"
          />
        </div>

        {/* Available Only Filter */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Switch
              checked={filters.onlyAvailable}
              onCheckedChange={(checked) => onFiltersChange({ onlyAvailable: checked })}
              id="available-only"
            />
            <label htmlFor="available-only" className="text-sm font-medium">
              Available only
            </label>
          </div>
        </div>

        {/* Refresh Interval */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Refresh</label>
              <span className="text-sm text-muted-foreground">{filters.refreshInterval}s</span>
            </div>
            <Slider
              value={[filters.refreshInterval]}
              onValueChange={([value]) => onFiltersChange({ refreshInterval: value })}
              min={5}
              max={60}
              step={5}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};