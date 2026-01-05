import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import type { ParkingFilters } from "@/types/parking";

type ParkingControlsProps = {
  filters: ParkingFilters;
  onFiltersChange: (newFilters: Partial<ParkingFilters>) => void;
  onSearch?: () => void; // optional
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
      </div>
    </Card>
  );
};
