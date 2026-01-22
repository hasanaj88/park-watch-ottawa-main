import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ParkingLot } from "@/types/parking";
import { MapPin, CheckCircle, AlertTriangle } from "lucide-react";
import {
  getLotCounts,
  getFreePct,
  availabilityLevelByFreePct,
} from "@/utils/parking";

interface ParkingListProps {
  lots: ParkingLot[];
  selectedLotId: string;
  onLotSelect: (lotId: string) => void;
}

export const ParkingList = ({ lots, selectedLotId, onLotSelect }: ParkingListProps) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Nearby Parking Lots</h3>

      <div className="max-h-[50vh] overflow-y-auto space-y-3">
        {lots.map((lot) => {
          const { total, free } = getLotCounts(lot);

          const freePct = getFreePct(lot); // number | null
          const level = freePct == null ? null : availabilityLevelByFreePct(freePct);

          const isSelected = String(lot.id) === String(selectedLotId);

          // ✅ icon color by level (60/30 thresholds)
          const StatusIcon = level === "busy" ? AlertTriangle : CheckCircle;

          const iconClass =
            level === "available"
              ? "text-parking-available"
              : level === "moderate"
              ? "status-dot-moderate"
              : "text-parking-busy";

          const dotClass =
            level === "available"
              ? "status-dot-available"
              : level === "moderate"
              ? "status-dot-moderate"
              : "status-dot-busy";

          const badgeVariant =
            level === "available" ? "default" : level === "moderate" ? "secondary" : "destructive";

          const badgeClass =
            level === "available"
              ? "status-available"
              : level === "moderate"
              ? "status-moderate"
              : "status-busy";

          const statusText =
            level === "available" ? "available" : level === "moderate" ? "moderate" : "busy";

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
                  <StatusIcon className={`h-4 w-4 ${iconClass}`} />
                  <div className={`w-2 h-2 rounded-full ${dotClass}`} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{lot.name}</h4>

                    {freePct === null ? (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        No data
                      </Badge>
                    ) : (
                      <Badge
                        variant={badgeVariant}
                        className={`text-xs px-2 py-0.5 ${badgeClass}`}
                        title="Free percentage"
                      >
                        {freePct}%
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-1">
                    {freePct === null ? "No live/estimated counts" : `${free} free • ${total} total`}
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
                      {freePct === null ? "—" : `${freePct}%`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {freePct === null ? "no data" : statusText}
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
