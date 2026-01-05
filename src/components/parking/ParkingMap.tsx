import { Card } from "@/components/ui/card";
import type { ParkingLot } from "@/types/parking";
import { CheckCircle, XCircle } from "lucide-react";
import { getLotCounts, getConfPct } from "@/utils/parkingLot";

interface ParkingMapProps {
  lots: ParkingLot[];
  selectedLotId: string;
  onLotSelect: (lotId: string) => void;
}

export const ParkingMap = ({ lots, selectedLotId, onLotSelect }: ParkingMapProps) => {
  return (
    <Card className="relative h-[52vh] overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-50" />

      <div className="absolute inset-0 parking-pins-grid">
        {lots.map((lot, index) => {
          const col = (index * 2) % 6;
          const row = Math.floor((index * 3) % 4);
          const isSelected = String(lot.id) === String(selectedLotId);

          const { total, free } = getLotCounts(lot);
          const confPct = getConfPct(lot);

          const isAvailable = lot.status === "available";

          return (
            <button
              key={String(lot.id)}
              onClick={() => onLotSelect(String(lot.id))}
              className={`
                justify-self-center align-self-center transform -translate-y-0.5
                glass-effect rounded-2xl p-3 text-xs font-medium cursor-pointer
                transition-all duration-200 hover:scale-105 hover:shadow-lg
                ${isSelected ? "ring-2 ring-parking-ring bg-parking-ring/10" : ""}
                ${isAvailable ? "hover:bg-parking-available/5" : "hover:bg-parking-busy/5"}
              `}
              style={{ gridColumn: col + 1, gridRow: row + 1 }}
            >
              <div className="flex items-center gap-2 mb-1">
                {isAvailable ? (
                  <CheckCircle className="h-3 w-3 text-parking-available" />
                ) : (
                  <XCircle className="h-3 w-3 text-parking-busy" />
                )}

                <span className="font-semibold max-w-[140px] truncate" title={lot.name}>
                  {lot.name}
                </span>
              </div>

              <div className="text-[10px] text-muted-foreground">
                <div>
                  {free} free / {total}
                </div>
                <div>• conf {confPct}%</div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
