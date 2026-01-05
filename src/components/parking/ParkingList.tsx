import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ParkingLot } from "@/types/parking";
import { MapPin, CheckCircle, AlertTriangle } from "lucide-react";
import { getLotCounts } from "@/utils/parkingLot";

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
  getAvailabilityPercentage,
}: ParkingListProps) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Nearby Parking Lots</h3>

      <div className="max-h-[50vh] overflow-y-auto space-y-3">
        {lots.map((lot) => {
          const { total, free } = getLotCounts(lot);

          const hasLiveData =
            (lot as any).hasLiveData === true ||
            (lot as any).free !== null ||
            (typeof free === "number" && Number.isFinite(free));

          const availabilityPercentage = hasLiveData ? getAvailabilityPercentage(lot) : null;

          const isSelected = String(lot.id) === String(selectedLotId);

          const isAvailable = lot.status === "available";
          const StatusIcon = isAvailable ? CheckCircle : AlertTriangle;

          const addressText = lot.address ?? "—";

          const rate = lot.pricing?.rate ?? "—";
          const maxStay = lot.pricing?.maxStay ?? "—";
          const openUntil = lot.pricing?.openUntil ?? "—";

          const amenities = Array.isArray(lot.amenities) ? lot.amenities : [];
          const showPricing = rate !== "—" || maxStay !== "—" || openUntil !== "—";

          return (
            <button
              key={String(lot.id)}
              onClick={() => onLotSelect(String(lot.id))}
              className={`
                w-full p-4 rounded-xl border bg-card text-left
                transition-all duration-200 hover:shadow-md hover:scale-[1.02]
                ${isSelected ? "ring-2 ring-parking-ring bg-parking-ring/5" : ""}
              `}
            >
              <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                <div className="flex flex-col items-center gap-1">
                  <StatusIcon
                    className={`
                      h-4 w-4
                      ${isAvailable ? "text-parking-available" : "text-parking-busy"}
                    `}
                  />
                  <div
                    className={`
                      w-2 h-2 rounded-full
                      ${isAvailable ? "status-dot-available" : "status-dot-busy"}
                    `}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{lot.name}</h4>

                    {availabilityPercentage === null ? (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        No live
                      </Badge>
                    ) : (
                      <Badge
                        variant={isAvailable ? "default" : "destructive"}
                        className={`
                          text-xs px-2 py-0.5
                          ${isAvailable ? "status-available" : "status-busy"}
                        `}
                      >
                        {availabilityPercentage}%
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-1">
                    {availabilityPercentage === null ? "No live data" : `${free} free • ${total} total`}
                  </p>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{addressText}</span>
                  </div>

                  {showPricing && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{rate}</span>
                      <span>•</span>
                      <span>Max: {maxStay}</span>
                      <span>•</span>
                      <span>Until: {openUntil}</span>
                    </div>
                  )}

                  {amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {amenities.slice(0, 3).map((amenity, index) => (
                        <span
                          key={`${amenity}-${index}`}
                          className="text-xs px-2 py-0.5 bg-muted rounded-md"
                        >
                          {amenity}
                        </span>
                      ))}
                      {amenities.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="text-center">
                    <div className="text-sm font-semibold">
                      {availabilityPercentage === null ? "—" : `${availabilityPercentage}%`}
                    </div>
                    <div className="text-xs text-muted-foreground">{lot.status}</div>
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
