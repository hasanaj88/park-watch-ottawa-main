import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Filter, Clock } from "lucide-react";
import type { ParkingFilters } from "@/types/parking";

type ParkingControlsProps = {
  filters: ParkingFilters;
  onFiltersChange: (newFilters: Partial<ParkingFilters>) => void;
  onSearch?: () => void; // add this
};

export const ParkingControls = ({ filters, onFiltersChange }: ParkingControlsProps) => {
  return (
    <Card className="p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available only */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Switch
            id="availableOnly"
            checked={filters.onlyAvailable}
            onCheckedChange={(checked) => onFiltersChange({ onlyAvailable: checked })}
          />
          <Label htmlFor="availableOnly" className="cursor-pointer">
            Available only
          </Label>
        </div>

        {/* Refresh interval */}
        <div className="lg:col-span-2 flex items-center gap-4 p-3 rounded-lg bg-muted/30">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Refresh</span>
              <span className="text-muted-foreground">{filters.refreshInterval}s</span>
            </div>
            <Slider
              value={[filters.refreshInterval]}
              min={5}
              max={60}
              step={5}
              onValueChange={(v) => onFiltersChange({ refreshInterval: v[0] })}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
