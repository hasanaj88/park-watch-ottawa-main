import React, { useEffect, useMemo, useState } from "react";
import ParkingCard, { ParkingLot } from "./ParkingCard";

import { buildAllSummaries } from "@/lib/traffic/trafficSummary";
import type { Camera, TrafficEvent } from "@/lib/traffic/trafficSummary";

import { getAllParkingData } from "@/services/trafficDataProvider";

type Props = {
  lots?: ParkingLot[];
  isLoading?: boolean;
  error?: unknown;
  availableOnly?: boolean;
  onCardClick?: (lot: ParkingLot) => void;
};

const isParkingLot = (x: ParkingLot | undefined | null): x is ParkingLot =>
  Boolean(x);

export default function ParkingCardsList({
  lots,
  isLoading = false,
  error,
  availableOnly = false,
  onCardClick,
}: Props) {
  const [localLots, setLocalLots] = useState<ParkingLot[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [trafficError, setTrafficError] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      try {
        const data = await getAllParkingData();
        if (!alive) return;

        setLocalLots(Array.isArray(data.lots) ? data.lots : []);
        setCameras(Array.isArray(data.cameras) ? data.cameras : []);
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (e) {
        if (!alive) return;
        setTrafficError(e);
        console.error("Failed to load parking or traffic data", e);
      }
    }

    loadAll();
    return () => {
      alive = false;
    };
  }, []);

  const safeLots = useMemo(() => {
    const source =
      Array.isArray(lots) && lots.length > 0 ? lots : localLots;
    return source.filter(isParkingLot);
  }, [lots, localLots]);

  const summariesByLotId = useMemo(() => {
    return buildAllSummaries(
      Array.isArray(cameras) ? cameras : [],
      Array.isArray(events) ? events : []
    );
  }, [cameras, events]);

  const visibleLots = useMemo(() => {
    if (!availableOnly) return safeLots;

    return safeLots.filter((lot) => {
      const free = lot.free ?? lot.available ?? 0;
      return free > 0;
    });
  }, [safeLots, availableOnly]);

  return (
    <div
      className="
        grid gap-4
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
      "
    >
      {visibleLots.map((lot) => (
        <ParkingCard
          key={String(lot.id)}
          lot={lot}
          trafficSummary={summariesByLotId[String(lot.id)]}
          onClick={() => onCardClick?.(lot)}
        />
      ))}
    </div>
  );
}

