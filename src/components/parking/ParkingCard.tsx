import React from "react";

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

function normalizeStatus(status?: string) {
  return String(status ?? "").trim().toLowerCase();
}

function trafficLabel(score: number) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function toInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/**
 * Supports both:
 * - conf as 0..100 (e.g. 82)
 * - conf/confidence as 0..1 (e.g. 0.82)
 */
function normalizeConf(lot: ParkingLot): number {
  const raw = Number(lot.conf ?? lot.confidence ?? 0);
  if (!Number.isFinite(raw)) return 0;
  // if it's 0..1 convert to percent
  if (raw > 0 && raw <= 1) return Math.round(raw * 100);
  // else assume already percent
  return Math.round(raw);
}

export default function ParkingCard({ lot, onClick, trafficSummary }: Props) {
  if (!lot) return null;

  const name = lot.name ?? "Unknown Parking";
  const address = lot.address;

  // ✅ show address first if exists (your request)
  const title = address?.trim() ? address : name;

  const status = lot.status ?? "unknown";
  const confPct = normalizeConf(lot);

  // Support both naming styles safely
  const free = toInt(lot.free ?? lot.available ?? 0, 0);
  const total = toInt(lot.total ?? lot.capacity ?? 0, 0);

  const s = normalizeStatus(status);
  const pct = total > 0 ? clamp(Math.round((free / total) * 100), 0, 100) : 0;

  const isAvailable = s === "available" || s === "open";
  const isBusy = s === "busy" || s === "full";
  const isClosed = s === "closed";

  const statusLabel = isAvailable
    ? "Available"
    : isBusy
    ? "Busy"
    : isClosed
    ? "Closed"
    : "Unknown";

  const theme = isAvailable
    ? {
        ring: "ring-emerald-500/25",
        chip:
          "bg-emerald-500/10 text-emerald-700 ring-emerald-600/25 " +
          "dark:bg-emerald-500/12 dark:text-emerald-200 dark:ring-emerald-500/25",
        bar: "bg-emerald-500",
        glow:
          "radial-gradient(700px circle at 20% 0%, rgba(16,185,129,0.18), transparent 45%)",
        dot: "text-emerald-500 dark:text-emerald-300",
      }
    : isBusy
    ? {
        ring: "ring-amber-500/25",
        chip:
          "bg-amber-500/10 text-amber-800 ring-amber-600/25 " +
          "dark:bg-amber-500/12 dark:text-amber-200 dark:ring-amber-500/25",
        bar: "bg-amber-500",
        glow:
          "radial-gradient(700px circle at 20% 0%, rgba(245,158,11,0.16), transparent 45%)",
        dot: "text-amber-500 dark:text-amber-300",
      }
    : isClosed
    ? {
        ring: "ring-rose-500/25",
        chip:
          "bg-rose-500/10 text-rose-800 ring-rose-600/25 " +
          "dark:bg-rose-500/12 dark:text-rose-200 dark:ring-rose-500/25",
        bar: "bg-rose-500",
        glow:
          "radial-gradient(700px circle at 20% 0%, rgba(244,63,94,0.16), transparent 45%)",
        dot: "text-rose-500 dark:text-rose-300",
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

  // Traffic info (safe defaults)
  const cameraCount = trafficSummary?.nearbyCameraCount ?? 0;
  const eventCount = trafficSummary?.nearbyEventCount ?? 0;
  const trafficScore = trafficSummary?.disruptionScore ?? 0;
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
              className="
                text-base font-semibold text-foreground
                line-clamp-2
                whitespace-normal
                break-words
                min-h-[2.5rem]
              "
              title={title}
            >
              {title}
            </h3>
          </div>

          {/* Optional: show the original name under address */}
          {address?.trim() ? (
            <div className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
              {name}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <span className="opacity-70">Free</span>{" "}
              <span className="font-semibold text-foreground">{free}</span>
            </span>

            <span className="rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <span className="opacity-70">Total</span>{" "}
              <span className="font-semibold text-foreground">{total}</span>
            </span>

            <span className="rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <span className="opacity-70">Conf</span>{" "}
              <span className="font-semibold text-foreground">{confPct}%</span>
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
          <span>Availability</span>
          <span className="font-semibold text-foreground/80">{pct}%</span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
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
