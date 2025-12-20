import React, { useMemo } from "react";
import ParkingCardsList from "./ParkingCardsList";
import { useParkingData } from "@/hooks/useParkingData"; // Adjust the import path as needed

export default function ParkingOverview() {
  const { lots, isLoading, error, selectLot } = useParkingData();

  // Adapter: converts capacity/occupied/confidence -> free/total/conf
  const cardLots = useMemo(
    () =>
      (lots ?? []).map((lot) => ({
        id: lot.id,
        name: lot.name,
        free: Math.max(0, (lot.capacity ?? 0) - (lot.occupied ?? 0)),
        total: lot.capacity ?? 0,
        conf: Math.round((lot.confidence ?? 0) * 100),
        status: lot.status,
      })),
    [lots]
  );

  return (
    <ParkingCardsList
      lots={cardLots}
      isLoading={isLoading}
      error={error}
      onCardClick={(cardLot) => selectLot(String(cardLot.id))}
    />
  );
}
