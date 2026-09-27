import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import type { ParkingFilters } from "@/types/parking";

type ParkingControlsProps = {
  filters: ParkingFilters;
  onFiltersChange: (
    newFilters: Partial<ParkingFilters>
  ) => void;
  onSearch?: () => void;
};

export const ParkingControls = ({
  filters,
  onFiltersChange,
}: ParkingControlsProps) => {
  return (
    <div className="mb-3 flex items-center">
      <div className="inline-flex h-10 items-center gap-2 rounded-full border bg-background/90 px-3 shadow-sm backdrop-blur">
        <Filter className="h-4 w-4 text-muted-foreground" />

        <Switch
          id="availableOnly"
          checked={filters.onlyAvailable}
          onCheckedChange={(checked) =>
            onFiltersChange({
              onlyAvailable: checked,
            })
          }
        />

        <Label
          htmlFor="availableOnly"
          className="cursor-pointer whitespace-nowrap text-sm font-medium"
        >
          Available only
        </Label>
      </div>
    </div>
  );
};