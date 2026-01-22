import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import type { ParkingLot } from "@/types/parking";
import { Car, MapPin } from "lucide-react";
import { useDeviceMode } from "@/hooks/useDeviceMode";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLotCounts } from "@/utils/parking";

/* =========================
   Types & helpers
========================= */
interface ParkingSpace {
  id: string;
  isOccupied: boolean;
  type: "standard" | "disabled" | "electric" | "compact";
}

function spaceTypeLabel(type: ParkingSpace["type"]) {
  switch (type) {
    case "disabled":
      return "Disabled";
    case "electric":
      return "Electric";
    case "compact":
      return "Compact";
    default:
      return "Standard";
  }
}

function freePctTheme(freePct: number) {
  if (freePct >= 60) {
    return {
      pill:
        "bg-emerald-500/10 text-emerald-700 ring-emerald-600/25 " +
        "dark:bg-emerald-500/12 dark:text-emerald-200 dark:ring-emerald-500/25",
      label: "Good",
    };
  }
  if (freePct >= 30) {
    return {
      pill:
        "bg-amber-500/10 text-amber-800 ring-amber-600/25 " +
        "dark:bg-amber-500/12 dark:text-amber-200 dark:ring-amber-500/25",
      label: "Moderate",
    };
  }
  return {
    pill:
      "bg-rose-500/10 text-rose-800 ring-rose-600/25 " +
      "dark:bg-rose-500/12 dark:text-rose-200 dark:ring-rose-500/25",
    label: "Busy",
  };
}

/* =========================
   Deterministic layout
========================= */
function hashToSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const generateParkingSpaces = (lot: ParkingLot, capacity: number, occupied: number): ParkingSpace[] => {
  if (capacity <= 0) return [];

  const spaces: ParkingSpace[] = [];
  const seed = hashToSeed(String((lot as any).id ?? (lot as any).map_id ?? "0"));
  const rand = mulberry32(seed);

  // shuffled indices to place occupied spots deterministically
  const indices = Array.from({ length: capacity }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const occ = Math.max(0, Math.min(occupied, capacity));
  const occupiedSet = new Set(indices.slice(0, occ));

  for (let i = 0; i < capacity; i++) {
    const type: ParkingSpace["type"] =
      i === 0
        ? "disabled"
        : i === 1 || i === 2
        ? "electric"
        : i % 8 === 0
        ? "compact"
        : "standard";

    spaces.push({
      id: `space-${i}`,
      isOccupied: occupiedSet.has(i),
      type,
    });
  }

  return spaces;
};

const getSpaceTypeColor = (type: ParkingSpace["type"], isOccupied: boolean) => {
  if (isOccupied) return "bg-red-500/80 border-red-600";
  switch (type) {
    case "disabled":
      return "bg-blue-500/80 border-blue-600";
    case "electric":
      return "bg-yellow-500/80 border-yellow-600";
    case "compact":
      return "bg-purple-500/80 border-purple-600";
    default:
      return "bg-green-500/80 border-green-600";
  }
};

const getSpaceTypeIcon = (type: ParkingSpace["type"]) => {
  switch (type) {
    case "disabled":
      return "♿";
    case "electric":
      return "⚡";
    case "compact":
      return "C";
    default:
      return "";
  }
};

/* =========================
   Component
========================= */
export const ParkingLotDetailMap = ({ lot }: { lot: ParkingLot }) => {
  const device = useDeviceMode();

  // getLotCounts supports both live and estimated lots (if enhancedLots added free/total)
  const counts = getLotCounts(lot as any);

  const capacity = Number(counts.total ?? 0);

  const free =
    typeof counts.free === "number" && Number.isFinite(counts.free)
      ? counts.free
      : null;

  // occupied: if missing, derive from capacity - free (works for estimated too)
  const occupied =
    typeof counts.occupied === "number" && Number.isFinite(counts.occupied)
      ? counts.occupied
      : free !== null
      ? Math.max(0, capacity - free)
      : null;

  const hasLive = capacity > 0 && free !== null && occupied !== null;

  const availableSpaces = hasLive ? free : 0;
  const freePct = hasLive ? Math.round((availableSpaces / capacity) * 100) : 0;
  const pctTheme = freePctTheme(freePct);

  const spaces = useMemo(() => {
    if (!hasLive) return [];
    return generateParkingSpaces(lot, capacity, occupied!);
  }, [hasLive, (lot as any).id, (lot as any).map_id, capacity, occupied]);

  const totalSpaces = spaces.length;
  const canRenderLayout = hasLive && totalSpaces > 0;

  const density = device === "mobile" ? 0.55 : device === "tablet" ? 0.9 : 1.3;
  const cols = totalSpaces > 0 ? Math.ceil(Math.sqrt(totalSpaces * density)) : 1;
  const rows = totalSpaces > 0 ? Math.ceil(totalSpaces / cols) : 1;

  const cellH = device === "mobile" ? "h-8" : device === "tablet" ? "h-10" : "h-12";
  const cellRadius = device === "mobile" ? "rounded-lg" : "rounded-md";
  const gridPadding = device === "mobile" ? "p-3" : "p-6";
  const enableTooltip = device === "desktop";

  const SpaceCell = ({ space }: { space: ParkingSpace }) => (
    <div
      className={`relative ${cellH} ${cellRadius} border-2 flex items-center justify-center text-white shadow-sm
        ${getSpaceTypeColor(space.type, space.isOccupied)}`}
    >
      {device !== "mobile" && (
        <span className="text-lg">
          {space.isOccupied ? <Car className="h-3 w-3" /> : getSpaceTypeIcon(space.type)}
        </span>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={80}>
      <Card className="p-6 border-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold truncate">{(lot as any).name ?? "Parking Lot"}</h3>
              <p className="text-sm text-muted-foreground">Detailed Parking Layout</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xl font-bold text-green-600">
              {hasLive ? availableSpaces : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {hasLive ? "available" : "no live data"}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-lg border">
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold ring-1",
              pctTheme.pill,
            ].join(" ")}
          >
            {hasLive ? `Free ${freePct}% · ${pctTheme.label}` : "No live data"}
          </span>

          {/* Optional badge (shows if estimated) */}
          {(lot as any).dataQuality === "ESTIMATED" && (
            <span className="text-xs text-muted-foreground">
              • Estimated
            </span>
          )}
          {(lot as any).dataQuality === "API" && (
            <span className="text-xs text-muted-foreground">
              • API
            </span>
          )}
        </div>

        {!canRenderLayout ? (
          <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
            Live availability data not available for this lot.
          </div>
        ) : (
          <div
            className={`grid gap-2 ${gridPadding} rounded-xl border-2 border-dashed relative`}
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {spaces.map((space, index) => {
              const title = `Space ${index + 1} — ${
                space.isOccupied ? "Occupied" : "Available"
              } (${spaceTypeLabel(space.type)})`;

              if (!enableTooltip) {
                return <SpaceCell key={space.id} space={space} />;
              }

              return (
                <Tooltip key={space.id}>
                  <TooltipTrigger asChild>
                    <div>
                      <SpaceCell space={space} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">{title}</div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
};
