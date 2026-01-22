import React from "react";
import { getLotCounts, hasLotCounts } from "@/utils/parking";

export type ParkingLot = {
  id: string | number;

  name?: string;
  address?: string;

  free?: number;
  total?: number;

  available?: number;
  capacity?: number;

  conf?: number;
  confidence?: number;
  status?: string;

  lat?: number;
  lng?: number;

  coordinates?: {
    lat: number;
    lng: number;
  };
};

export type TrafficSummary = {
  nearbyCameraCount: number;
  nearbyEventCount: number;
  disruptionScore: number; // 0..100
  maxPriority: "HIGH" | "MEDIUM" | "LOW" | "NONE";
};

type Props = {
  lot?: ParkingLot;
  onClick?: (lot: ParkingLot) => void;
  trafficSummary?: TrafficSummary;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function trafficLabel(score: number) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

// Availability levels:
// >=60 Available, 30..59 Moderate, <30 Busy, 0 Full, null Unknown
type UiLevel = "unknown" | "full" | "busy" | "moderate" | "available";

function getUiLevel(availabilityPct: number | null): UiLevel {
  if (availabilityPct === null) return "unknown";
  if (availabilityPct <= 0) return "full";
  if (availabilityPct < 30) return "busy";
  if (availabilityPct < 60) return "moderate";
  return "available";
}

export default function ParkingCard({ lot, onClick, trafficSummary }: Props) {
  if (!lot) return null;

  const name = lot.name ?? "Unknown Parking";
  const address = lot.address;
  const title = address?.trim() ? address : name;

  const { free, total } = getLotCounts(lot as any);
  const hasCounts = hasLotCounts(lot as any);

  const availabilityPct =
    hasCounts && total > 0 ? clamp(Math.round((free / total) * 100), 0, 100) : null;

  const occupiedPct =
    hasCounts && total > 0
      ? clamp(Math.round(((total - free) / total) * 100), 0, 100)
      : null;

  const level = getUiLevel(availabilityPct);

  const statusLabel =
    level === "unknown"
      ? "No live data"
      : level === "full"
      ? "Full"
      : level === "busy"
      ? "Busy"
      : level === "moderate"
      ? "Moderate"
      : "Available";

  // Themes for different availability levels:
  // - available: parking-available
  // - moderate: --parking-moderate (HSL)
  // - busy/full: parking-busy
  // - unknown: sky-500
  const theme =
    level === "available"
      ? {
          ring: "ring-parking-available/25",
          chip: "bg-parking-available/10 text-parking-available ring-parking-available/25",
          bar: "bg-parking-available",
          glow:
            "radial-gradient(700px circle at 20% 0%, hsl(var(--parking-available) / 0.18), transparent 45%)",
          dot: "text-parking-available",
        }
      : level === "moderate"
      ? {
          ring: "ring-[hsl(var(--parking-moderate))/0.30]",
          chip:
            "bg-[hsl(var(--parking-moderate))/0.12] text-[hsl(var(--parking-moderate))] " +
            "ring-[hsl(var(--parking-moderate))/0.25]",
          bar: "bg-[hsl(var(--parking-moderate))]",
          glow:
            "radial-gradient(700px circle at 20% 0%, hsl(var(--parking-moderate) / 0.16), transparent 45%)",
          dot: "text-[hsl(var(--parking-moderate))]",
        }
      : level === "busy" || level === "full"
      ? {
          ring: "ring-parking-busy/25",
          chip: "bg-parking-busy/10 text-parking-busy ring-parking-busy/25",
          bar: "bg-parking-busy",
          glow:
            "radial-gradient(700px circle at 20% 0%, hsl(var(--parking-busy) / 0.16), transparent 45%)",
          dot: "text-parking-busy",
        }
      : {
          ring: "ring-sky-500/20",
          chip:
            "bg-sky-500/10 text-sky-800 ring-sky-600/20 " +
            "dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/20",
          bar: "bg-sky-500",
          glow:
            "radial-gradient(700px circle at 20% 0%, rgba(56,189,248,0.14), transparent 45%)",
          dot: "text-sky-500 dark:text-sky-300",
        };

  const handleClick = () => onClick?.(lot);

  const cameraCount = trafficSummary?.nearbyCameraCount ?? 0;
  const eventCount = trafficSummary?.nearbyEventCount ?? 0;
  const trafficScore = clamp(trafficSummary?.disruptionScore ?? 0, 0, 100);
  const priority = trafficSummary?.maxPriority ?? "NONE";
  const trafficLevel = trafficLabel(trafficScore);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={[
        "group relative overflow-hidden rounded-2xl",
        "glass-effect",
        "p-5 shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-2xl",
        "border border-border",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        "ring-1",
        "w-full min-w-0 sm:min-w-[260px] lg:min-w-0",
        "max-w-full",
        "flex flex-col",
        theme.ring,
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: theme.glow }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-lg leading-none ${theme.dot}`}>●</span>

            <h3
              className="text-base font-semibold text-foreground line-clamp-2 whitespace-normal break-words min-h-[2.5rem]"
              title={title}
            >
              {title}
            </h3>
          </div>

          {address?.trim() ? (
            <div className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
              {name}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <span className="opacity-70">Free</span>{" "}
              <span className="font-semibold text-foreground">
                {hasCounts ? free : "—"}
              </span>
            </span>

            <span className="rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <span className="opacity-70">Total</span>{" "}
              <span className="font-semibold text-foreground">
                {total && total > 0 ? total : "—"}
              </span>
            </span>

            <span className="rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <span className="opacity-70">Free%</span>{" "}
              <span className="font-semibold text-foreground">
                {availabilityPct === null ? "—" : `${availabilityPct}%`}
              </span>
            </span>
          </div>
        </div>

        <span
          className={[
            "shrink-0 inline-flex items-center rounded-full px-3 py-1",
            "text-[11px] font-semibold ring-1",
            theme.chip,
          ].join(" ")}
        >
          {statusLabel}
        </span>
      </div>

      <div className="relative mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Occupied</span>
          <span className="font-semibold text-foreground/80">
            {occupiedPct === null ? "—" : `${occupiedPct}%`}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${occupiedPct === null ? 0 : occupiedPct}%` }}
          >
            <div className={`h-full w-full ${theme.bar}`} />
          </div>
        </div>
      </div>

      <div className="relative mt-4 rounded-xl bg-black/5 p-3 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Traffic context</span>
          <span className="font-semibold text-foreground/80">
            {trafficLevel} · {trafficScore}/100
          </span>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
          <div className="rounded-lg bg-white/40 px-2 py-1 ring-1 ring-black/5 dark:bg-black/20 dark:ring-white/10">
            <div className="opacity-70">Cameras</div>
            <div className="font-semibold text-foreground">{cameraCount}</div>
          </div>

          <div className="rounded-lg bg-white/40 px-2 py-1 ring-1 ring-black/5 dark:bg-black/20 dark:ring-white/10">
            <div className="opacity-70">Incidents</div>
            <div className="font-semibold text-foreground">{eventCount}</div>
          </div>

          <div className="rounded-lg bg-white/40 px-2 py-1 ring-1 ring-black/5 dark:bg-black/20 dark:ring-white/10">
            <div className="opacity-70">Priority</div>
            <div className="font-semibold text-foreground">
              {priority === "NONE" ? "—" : priority}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Click to open dashboard</span>
        <span className="opacity-0 transition-opacity group-hover:opacity-100">
          Enter ↵
        </span>
      </div>
    </div>
  );
}
