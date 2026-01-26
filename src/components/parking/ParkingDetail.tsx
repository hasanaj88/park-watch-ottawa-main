import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, Clock, DollarSign, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { ParkingLot } from "@/types/parking";
import {
  getLotCounts,
  getFreePct,
  availabilityLevelByFreePct,
} from "@/utils/parking";

export type TrafficSummary = {
  nearbyCameraCount: number;
  nearbyEventCount: number;
  disruptionScore: number; // 0..100
  maxPriority: "HIGH" | "MEDIUM" | "LOW" | "NONE";
};

interface ParkingDetailProps {
  lot: ParkingLot;
  availabilityPercentage: number; // keep prop for compatibility
  onNavigate: (lot: ParkingLot) => void;
  trafficSummary?: TrafficSummary;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeNumber(x: unknown, fallback = 0) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function trafficLabel(score: number) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export const ParkingDetail = ({
  lot,
  availabilityPercentage, // fallback only
  onNavigate,
  trafficSummary,
}: ParkingDetailProps) => {
  //  Canonical counts
  const { free, total } = getLotCounts(lot as any);

  //  Canonical free% (preferred) using shared helper (respects hasLotCounts)
  const freePctFromCounts = getFreePct(lot); // number | null

  //  Fallback to prop if canonical is missing
  const pct =
    freePctFromCounts !== null
      ? freePctFromCounts
      : Number.isFinite(availabilityPercentage)
      ? clamp(safeNumber(availabilityPercentage, 0), 0, 100)
      : null;

  const level = pct === null ? null : availabilityLevelByFreePct(pct);

  const statusText =
    pct === null
      ? "No data"
      : level === "available"
      ? "Available"
      : level === "moderate"
      ? "Moderate"
      : "Busy";

  const StatusIcon = level === "busy" ? AlertTriangle : CheckCircle;

  const badgeVariant =
    pct === null ? "secondary" : level === "busy" ? "destructive" : "default";

  const badgeClass =
    pct === null
      ? ""
      : level === "available"
      ? "status-available"
      : level === "moderate"
      ? "status-moderate"
      : "status-busy";

  // Gauge color by level
  const ringStroke =
    pct === null
      ? "hsl(var(--muted))"
      : level === "available"
      ? "hsl(var(--parking-available))"
      : level === "moderate"
      ? "hsl(var(--parking-moderate))"
      : "hsl(var(--parking-busy))";

  // display numbers
  const capacity = total > 0 ? total : safeNumber((lot as any).capacity, 0);
  const availableSpots = free === null || free === undefined ? null : free;
  const occupiedSpots =
    availableSpots === null || !Number.isFinite(capacity) || capacity <= 0
      ? null
      : Math.max(0, capacity - availableSpots);

  // confidence
  //const rawConf = safeNumber((lot as any).confidence ?? (lot as any).conf, 0);
  //const confPct = clamp(Math.round(rawConf > 1 ? rawConf : rawConf * 100), 0, 100);

  const pricing = (lot as any).pricing ?? {};
  const maxStay = pricing?.maxStay ?? "—";
  const rate = pricing?.rate ?? "—";
  const openUntil = pricing?.openUntil ?? "—";

  const address = (lot as any).address ?? "—";

  const lastUpdatedRaw = (lot as any).lastUpdated;
  const lastUpdatedDate =
    lastUpdatedRaw instanceof Date
      ? lastUpdatedRaw
      : lastUpdatedRaw
      ? new Date(lastUpdatedRaw)
      : null;

  // ---- Traffic ----
  const cameraCount = trafficSummary?.nearbyCameraCount ?? 0;
  const eventCount = trafficSummary?.nearbyEventCount ?? 0;
  const trafficScore = clamp(trafficSummary?.disruptionScore ?? 0, 0, 100);
  const priority = trafficSummary?.maxPriority ?? "NONE";
  const trafficLevel = trafficLabel(trafficScore);

  const handleNavigate = () => onNavigate(lot);

  return (
    <Card className="p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">{lot.name}</h2>
          <p className="text-sm text-muted-foreground mb-2">ID: {lot.id}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {address}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant} className={`gap-1 ${badgeClass}`}>
            <StatusIcon className="h-3 w-3" />
            {pct === null ? "No data" : `${pct}% free`}
          </Badge>
        </div>
      </div>

      {/* Availability Gauge */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 36 36" className="w-16 h-16">
            <path
              stroke="hsl(var(--muted))"
              strokeWidth="3.5"
              fill="none"
              d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
            />
            <path
              stroke={ringStroke}
              strokeWidth="3.5"
              fill="none"
              strokeDasharray={`${pct ?? 0}, 100`}
              d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold">{pct === null ? "—" : `${pct}%`}</span>
          </div>
        </div>

        <div>
          <div className="text-2xl font-bold mb-1">
            {availableSpots === null || capacity <= 0 ? "—" : `${availableSpots} free / ${capacity}`}
          </div>
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-medium text-foreground">{statusText}</span>
            {" · "}
            Occupied: {occupiedSpots === null ? "—" : `${occupiedSpots} spaces`}
          </p>
        </div>
      </div>

      {/* Traffic Context */}
      {trafficSummary && (
        <div className="mb-6 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Traffic context</span>
            <span className="text-muted-foreground">
              {trafficLevel} · <strong className="text-foreground">{trafficScore}/100</strong>
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <span className="text-sm text-muted-foreground">Cameras</span>
              <strong className="text-sm">{cameraCount}</strong>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <span className="text-sm text-muted-foreground">Incidents</span>
              <strong className="text-sm">{eventCount}</strong>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <span className="text-sm text-muted-foreground">Priority</span>
              <strong className="text-sm">{priority === "NONE" ? "—" : priority}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <span className="text-sm text-muted-foreground">Max Stay</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <strong className="text-sm">{maxStay}</strong>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <span className="text-sm text-muted-foreground">Rate</span>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <strong className="text-sm">{rate}</strong>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <span className="text-sm text-muted-foreground">Open Until</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <strong className="text-sm">{openUntil}</strong>
          </div>
        </div>
      </div>

      {/* Amenities */}
      {Array.isArray((lot as any).amenities) && (lot as any).amenities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {(lot as any).amenities.map((amenity: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={handleNavigate} className="gap-2 flex-1">
          <Navigation className="h-4 w-4" />
          Navigate with Google Maps
        </Button>
      </div>

      {/* Last Updated */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Last updated:{" "}
          {lastUpdatedDate && !Number.isNaN(lastUpdatedDate.getTime())
            ? lastUpdatedDate.toLocaleTimeString()
            : "—"}
        </p>
      </div>
    </Card>
  );
};

