import React, { useMemo, useState, useCallback } from "react";
import ParkingCardsList from "@/components/parking/ParkingCardsList";
import { useParkingLots } from "@/hooks/useParkingLots";

type CardLot = {
  id: string | number;
  name: string;
  free: number;
  total: number;
  conf: number;
  status?: string | null;
};

export default function ParkingOverview() {
  //  hook loading  isLoading 
  const { lots, loading, error } = useParkingLots();

  // selectLot
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  const selectLot = useCallback((id: string) => {
    setSelectedLotId(id);
    //Context/Router 
  }, []);

  // Adapter available  occupied confidence
  const cardLots: CardLot[] = useMemo(() => {
    return (lots ?? []).map((lot: any) => {
      const id = lot.id ?? lot.map_id ?? lot.lot_id;
      const name = lot.name ?? lot.map_name ?? "Unknown";

      const capacity = Number(lot.capacity ?? lot.map_capacity ?? 0);

      // available 
      const available =
        lot.available ?? lot.map_available ?? (lot.free ?? undefined);

      // available، occupied
      const occupied = lot.occupied ?? lot.map_occupied;

      let free: number;
      if (available !== undefined && available !== null) {
        free = Math.max(0, Number(available));
      } else if (occupied !== undefined && occupied !== null) {
        free = Math.max(0, capacity - Number(occupied));
      } else {
        free = 0;
      }

      // confidence 
      const confidence = lot.confidence ?? lot.conf ?? null;
      const conf = confidence == null ? 0 : Math.round(Number(confidence) * 100);

      const status = lot.status ?? lot.map_status ?? null;

      return { id, name, free, total: capacity, conf, status };
    });
  }, [lots]);

  return (
    <ParkingCardsList
      lots={cardLots}
      isLoading={loading}
      error={error}
      onCardClick={(cardLot: CardLot) => selectLot(String(cardLot.id))}
      // ParkingCardsList selectedId
      // selectedId={selectedLotId}
    />
  );
}

