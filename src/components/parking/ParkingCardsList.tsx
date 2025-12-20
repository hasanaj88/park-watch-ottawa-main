import React, { useMemo } from "react";
import ParkingCard, { ParkingLot } from "./ParkingCard";

type Props = {
  lots?: ParkingLot[];
  isLoading?: boolean;
  error?: unknown;
  availableOnly?: boolean;
  onCardClick?: (lot: ParkingLot) => void;
};

const isParkingLot = (
  x: ParkingLot | undefined | null
): x is ParkingLot => Boolean(x);

export default function ParkingCardsList({
  lots,
  isLoading = false,
  error,
  availableOnly = false,
  onCardClick,
}: Props) {
  const safeLots = Array.isArray(lots) ? lots : [];

  const visibleLots = useMemo(() => {
    const cleaned = safeLots.filter(isParkingLot);

    if (!availableOnly) return cleaned;

    return cleaned.filter(
      (l) => String(l.status ?? "").toLowerCase() === "available"
    );
  }, [safeLots, availableOnly]);

  if (isLoading) {
    return (
      <div className="text-white/70 text-sm">Loading parking locations...</div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load parking locations.
      </div>
    );
  }

  if (safeLots.length === 0) {
    return (
      <div className="text-white/60 text-sm">No parking locations found.</div>
    );
  }

  if (availableOnly && visibleLots.length === 0) {
    return (
      <div className="text-white/60 text-sm">
        No available parking right now (filter is ON).
      </div>
    );
  }

  return (
  <div className="rounded-2xl p-6
    bg-gradient-to-br
    from-slate-800/80
    via-slate-900/70
    to-emerald-900/40
    backdrop-blur-md border border-white/10 shadow-xl">

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleLots.map((lot) => (
        <ParkingCard
          key={String(lot.id ?? lot.name ?? `${lot.status}-${Math.random()}`)}
          lot={lot}
          onClick={onCardClick}
        />
      ))}
    </div>

  </div>
);
}

