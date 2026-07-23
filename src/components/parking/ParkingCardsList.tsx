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

const isParkingLot = (
  x: ParkingLot | undefined | null
): x is ParkingLot => Boolean(x);

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

        setCameras([]);
        setEvents([]);

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

  const visibleLots = useMemo(() => {
    if (!availableOnly) return safeLots;

    return safeLots.filter((lot) => {
      const pct = getFreePct(lot);

      if (pct === null) return false;

      return pct > 0;
    });
  }, [safeLots, availableOnly]);

  const summariesByLotId = useMemo(() => {
    try {
      const lotsForSummary = safeLots
        .filter(hasCoords)
        .map((lot) => ({
          id: String(lot.id),
          coordinates: lot.coordinates!,
        }));

      const safeCameras = Array.isArray(cameras) ? cameras : [];
      const safeEvents = Array.isArray(events) ? events : [];

      return buildAllSummaries(
        lotsForSummary,
        safeCameras,
        safeEvents,
        800
      );
    } catch (e) {
      console.error("Failed to build traffic summaries", e);

      return {} as Record<string, any>;
    }
  }, [safeLots, cameras, events]);

  if (isLoading && !safeLots.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading parking cards…
      </div>
    );
  }

  if (error && !safeLots.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Could not load parking cards right now.
      </div>
    );
  }

  if (!visibleLots.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No parking lots to display.
      </div>
    );
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleLots.map((lot, index) => {
        const lotId = String(
          lot.id ??
            (lot as any).lot?.id ??
            (lot as any).lot_id ??
            index
        );

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