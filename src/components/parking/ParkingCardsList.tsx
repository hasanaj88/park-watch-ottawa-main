import React, { useEffect, useMemo, useState } from "react";
import ParkingCard from "./ParkingCard";
import type { ParkingLot } from "@/types/parking";
import { buildAllSummaries } from "@/lib/traffic/trafficSummary";
import type { Camera, TrafficEvent } from "@/lib/traffic/trafficSummary";
import { getAllParkingData } from "@/services/trafficDataProvider";
import { getFreePct } from "@/utils/parking";

type Props = {
  lots?: ParkingLot[];
  isLoading?: boolean;
  error?: unknown;
  availableOnly?: boolean;
  onCardClick?: (lot: ParkingLot) => void;
};

const isParkingLot = (x: ParkingLot | undefined | null): x is ParkingLot => Boolean(x);

function hasCoords(lot: ParkingLot) {
  const c = lot.coordinates;
  return (
    c &&
    typeof c.lat === "number" &&
    Number.isFinite(c.lat) &&
    typeof c.lng === "number" &&
    Number.isFinite(c.lng)
  );
}

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
        setTrafficError(null);
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
    const source = Array.isArray(lots) && lots.length > 0 ? lots : localLots;
    return source.filter(isParkingLot);
  }, [lots, localLots]);

  /**  availableOnly = has counts and freePct > 0 */
  const visibleLots = useMemo(() => {
    if (!availableOnly) return safeLots;

    return safeLots.filter((lot) => {
      const pct = getFreePct(lot);
      if (pct === null) return false; // No counts/data → hide in "available only"
      return pct > 0;                 // At least some free spots
    });
  }, [safeLots, availableOnly]);

  const summariesByLotId = useMemo(() => {
    try {
      const lotsForSummary = safeLots
        .filter(hasCoords)
        .map((l) => ({
          id: String(l.id),
          coordinates: l.coordinates!, // safe
        }));

      const cams = Array.isArray(cameras) ? cameras : [];
      const evs = Array.isArray(events) ? events : [];

      // radius (meters)
      return buildAllSummaries(lotsForSummary, cams, evs, 800);
    } catch (e) {
      console.error("Failed to build traffic summaries", e);
      return {} as Record<string, any>;
    }
  }, [safeLots, cameras, events]);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading parking cards…</div>;
  }

  if (error || trafficError) {
    return <div className="p-4 text-sm text-muted-foreground">Could not load cards right now.</div>;
  }

  if (!visibleLots.length) {
    return <div className="p-4 text-sm text-muted-foreground">No parking lots to display.</div>;
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {visibleLots.map((lot) => {
        const lotId = String(lot.id);
        return (
          <ParkingCard
            key={lotId}
            lot={lot}
            trafficSummary={summariesByLotId[lotId] ?? undefined}
            onClick={() => onCardClick?.(lot)}
          />
        );
      })}
    </div>
  );
}
