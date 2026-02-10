import React, { useMemo, useState, useCallback } from "react";
import ParkingCardsList from "@/components/parking/ParkingCardsList";
import { useParkingLots } from "@/hooks/useParkingLots";
import type { ParkingLot } from "@/types/parking";

export default function ParkingOverview() {
  const { lots, loading, error } = useParkingLots();

  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  const selectLot = useCallback((id: string) => {
    setSelectedLotId(id);
    // TODO: Context/Router
  }, []);

  //  Normalize raw data -> ParkingLot (project type)
  const parkingLots: ParkingLot[] = useMemo(() => {
    return (lots ?? []).map((raw: any) => {
      const id = String(raw.id ?? raw.map_id ?? raw.lot_id ?? "");
      const name = String(raw.name ?? raw.map_name ?? "Unknown");

      const capacity = Number(raw.capacity ?? raw.map_capacity ?? 0);

      const available = raw.available ?? raw.map_available ?? raw.free;
      const occupied = raw.occupied ?? raw.map_occupied;

      let free = 0;
      if (available !== undefined && available !== null) {
        free = Math.max(0, Number(available));
      } else if (occupied !== undefined && occupied !== null) {
        free = Math.max(0, capacity - Number(occupied));
      }

      const confidence = raw.confidence ?? raw.conf ?? null;
      const conf = confidence == null ? 0 : Math.round(Number(confidence) * 100);

      const status = raw.status ?? raw.map_status ?? null;

      //  ParkingLot type in your project REQUIRES `lot`
      // If raw.lot exists, we keep it, otherwise we build a minimal lot object.
      const lot = raw.lot ?? { id, name };

      // Build object with only the common fields you likely have in ParkingLot
      // (If your ParkingLot has different field names, adjust here.)
      const normalized: ParkingLot = {
        lot,
        free,
        capacity,
        conf,
        status,
      } as unknown as ParkingLot;

      return normalized;
    });
  }, [lots]);

  return (
    <ParkingCardsList
      lots={parkingLots}
      isLoading={loading}
      error={error}
      onCardClick={(lot: ParkingLot) => {
        const clickedId = String((lot as any).id ?? (lot as any).lot?.id ?? (lot as any).lot_id ?? "");
        selectLot(clickedId);
      }}
      // selectedId={selectedLotId}
    />
  );
}
