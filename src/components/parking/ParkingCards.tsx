import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParkingLot } from "@/types/parking";

type Props = {
  lots: ParkingLot[];
  selectedLotId: string;
  onSelect: (id: string) => void;
  onNavigate?: (lot: ParkingLot) => void;
};

export default function ParkingCards({ lots, selectedLotId, onSelect, onNavigate }: Props) {
  return (
    <div className="space-y-3">
      {lots.map((lot) => {
        const free = lot.capacity - lot.occupied;
        const isSelected = lot.id === selectedLotId;

        return (
          <Card key={lot.id} className={`p-4 ${isSelected ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{lot.name}</div>
                <div className="text-sm text-muted-foreground">
                  {free} free / {lot.capacity} • conf {Math.round(lot.confidence * 100)}%
                </div>
                <div className="text-xs mt-1">
                  Status:{" "}
                  <span className={lot.status === "available" ? "text-emerald-600" : "text-rose-600"}>
                    {lot.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => onSelect(lot.id)}>
                  Select
                </Button>
                {onNavigate ? (
                  <Button onClick={() => onNavigate(lot)}>Go</Button>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
