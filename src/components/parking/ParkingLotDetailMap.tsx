import { Card } from "@/components/ui/card";
import { ParkingLot } from "@/types/parking";
import { Car, MapPin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ParkingSpace {
  id: string;
  isOccupied: boolean;
  type: "standard" | "disabled" | "electric" | "compact";
}

interface ParkingLotDetailMapProps {
  lot: ParkingLot;
}

function safeInt(x: unknown, fallback = 0) {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
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
  // 0-29 busy, 30-59 medium, 60-100 good
  if (freePct >= 60) {
    return {
      pill:
        "bg-emerald-500/10 text-emerald-700 ring-emerald-600/25 " +
        "dark:bg-emerald-500/12 dark:text-emerald-200 dark:ring-emerald-500/25",
      text: "text-emerald-600",
      label: "Good",
    };
  }
  if (freePct >= 30) {
    return {
      pill:
        "bg-amber-500/10 text-amber-800 ring-amber-600/25 " +
        "dark:bg-amber-500/12 dark:text-amber-200 dark:ring-amber-500/25",
      text: "text-amber-600",
      label: "Moderate",
    };
  }
  return {
    pill:
      "bg-rose-500/10 text-rose-800 ring-rose-600/25 " +
      "dark:bg-rose-500/12 dark:text-rose-200 dark:ring-rose-500/25",
    text: "text-rose-600",
    label: "Busy",
  };
}

// Generate parking spaces layout for visualization
const generateParkingSpaces = (lot: ParkingLot): ParkingSpace[] => {
  const spaces: ParkingSpace[] = [];

  const capacity = safeInt((lot as any).capacity, 0);
  const occupied = safeInt((lot as any).occupied, 0);

  for (let i = 0; i < capacity; i++) {
    const isOccupied = i < occupied;
    const type =
      i === 0
        ? "disabled"
        : i === 1 || i === 2
        ? "electric"
        : i % 8 === 0
        ? "compact"
        : "standard";

    spaces.push({
      id: `space-${i}`,
      isOccupied,
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

export const ParkingLotDetailMap = ({ lot }: ParkingLotDetailMapProps) => {
  const spaces = generateParkingSpaces(lot);

  const capacity = safeInt((lot as any).capacity, 0);
  const occupied = safeInt((lot as any).occupied, 0);
  const availableSpaces = Math.max(0, capacity - occupied);

  const totalSpaces = spaces.length;
  const cols = totalSpaces > 0 ? Math.ceil(Math.sqrt(totalSpaces * 1.5)) : 1;
  const rows = totalSpaces > 0 ? Math.ceil(totalSpaces / cols) : 1;

  const freePct =
    capacity > 0 ? Math.round((availableSpaces / capacity) * 100) : 0;
  const pctTheme = freePctTheme(freePct);

  return (
    <TooltipProvider delayDuration={80}>
      <Card className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{lot.name}</h3>
              <p className="text-sm text-muted-foreground">
                Detailed Parking Layout
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {availableSpaces}
            </div>
            <div className="text-xs text-muted-foreground">available</div>
          </div>
        </div>

        {/* Legend + Free% chip */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/80 border border-green-600 rounded" />
            <span className="text-xs">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500/80 border border-red-600 rounded" />
            <span className="text-xs">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500/80 border border-blue-600 rounded" />
            <span className="text-xs">Disabled ♿</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500/80 border border-yellow-600 rounded" />
            <span className="text-xs">Electric ⚡</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500/80 border border-purple-600 rounded" />
            <span className="text-xs">Compact</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold ring-1",
                pctTheme.pill,
              ].join(" ")}
              title="Free percentage based on (available / total)"
            >
              Free {freePct}% · {pctTheme.label}
            </span>
          </div>
        </div>

        {/* Parking Spaces Grid */}
        <div
          className="grid gap-2 p-6 bg-gray-200/30 dark:bg-slate-700/30 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 relative"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {/* Road markings background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(90deg, transparent 0%, transparent 45%, #666 45%, #666 55%, transparent 55%, transparent 100%),
                  linear-gradient(0deg, transparent 0%, transparent 45%, #666 45%, #666 55%, transparent 55%, transparent 100%)
                `,
                backgroundSize: `${100 / cols}% ${100 / rows}%`,
              }}
            />
          </div>

          {spaces.map((space, index) => {
            const typeLabel = spaceTypeLabel(space.type);
            const stateLabel = space.isOccupied ? "Occupied" : "Available";

            return (
              <Tooltip key={space.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      relative h-12 rounded-md border-2 transition-all duration-200 hover:scale-105 cursor-pointer
                      flex items-center justify-center text-xs font-semibold text-white shadow-sm
                      ${getSpaceTypeColor(space.type, space.isOccupied)}
                    `}
                    aria-label={`Space ${index + 1}`}
                  >
                    {/* Space number */}
                    <span className="absolute top-0.5 left-1 text-[10px] opacity-75">
                      {index + 1}
                    </span>

                    {/* Type icon */}
                    <span className="text-lg">
                      {space.isOccupied ? (
                        <Car className="h-3 w-3" />
                      ) : (
                        getSpaceTypeIcon(space.type)
                      )}
                    </span>
                  </div>
                </TooltipTrigger>

                <TooltipContent side="top" align="center">
                  <div className="text-xs">
                    <div className="font-semibold">
                      Space {index + 1} — {stateLabel}
                    </div>
                    <div className="opacity-80">{typeLabel}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {availableSpaces}
            </div>
            <div className="text-xs text-muted-foreground">Available</div>
          </div>

          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-lg font-bold text-red-600">{occupied}</div>
            <div className="text-xs text-muted-foreground">Occupied</div>
          </div>

          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{capacity}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>

          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className={`text-lg font-bold ${pctTheme.text}`}>{freePct}%</div>
            <div className="text-xs text-muted-foreground">Free</div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};
