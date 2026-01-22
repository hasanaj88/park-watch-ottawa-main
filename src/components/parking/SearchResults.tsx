// src/components/parking/SearchResults.tsx
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ParkingLot } from "@/types/parking";
import {
  Search,
  MapPin,
  Navigation,
  Clock,
  DollarSign,
  CircleCheckBig,
  CircleX,
  TriangleAlert,
} from "lucide-react";

import {
  getLotCounts,
  getFreePct,
  availabilityLevelByFreePct,
  type AvailabilityLevel,
} from "@/utils/parking";

interface SearchResultsProps {
  onSearch: (query: string) => Promise<ParkingLot[]>;
  onLotSelect: (lotId: string) => void;
  onNavigate: (lot: ParkingLot) => void;
}

function formatKm(km?: number | null) {
  if (km === undefined || km === null) return null;
  if (!Number.isFinite(km)) return null;
  return km < 10 ? km.toFixed(1) : km.toFixed(0);
}

function levelUi(level: AvailabilityLevel | "unknown") {
  // available (>=60)  moderate (30..59)  busy (<30)
  if (level === "available") {
    return {
      label: "Available",
      Icon: CircleCheckBig,
      badgeClass:
        "bg-parking-available/10 text-parking-available border-parking-available/25",
      iconClass: "text-parking-available",
      cardRingClass: "hover:ring-1 hover:ring-parking-available/25",
    };
  }
  if (level === "moderate") {
    return {
      label: "Moderate",
      Icon: CircleCheckBig, //Yellow ⚠️
      badgeClass:
        "bg-[hsl(var(--parking-moderate))/0.12] text-[hsl(var(--parking-moderate))] border-[hsl(var(--parking-moderate))/0.25]",
      iconClass: "text-[hsl(var(--parking-moderate))]",
      cardRingClass: "hover:ring-1 hover:ring-[hsl(var(--parking-moderate))/0.35]",
    };
  }
  if (level === "busy") {
    return {
      label: "Busy",
      Icon: CircleX, // ❌ Red
      badgeClass: "bg-parking-busy/10 text-parking-busy border-parking-busy/25",
      iconClass: "text-parking-busy",
      cardRingClass: "hover:ring-1 hover:ring-parking-busy/25",
    };
  }
  return {
    label: "No live data",
    Icon: TriangleAlert,
    badgeClass: "bg-muted text-muted-foreground border-border",
    iconClass: "text-muted-foreground",
    cardRingClass: "hover:ring-1 hover:ring-border",
  };
}

export const SearchResults = ({ onSearch, onLotSelect, onNavigate }: SearchResultsProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ParkingLot[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const results = await onSearch(searchQuery);
        if (!cancelled) setSearchResults(Array.isArray(results) ? results : []);
      } catch (e) {
        console.error("Search error:", e);
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery, onSearch]);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Search Parking Locations</h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter address or location (e.g., '819 Dynes Rd', 'Downtown Ottawa')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isSearching && (
        <div className="text-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-parking-ring border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Searching parking locations...</p>
        </div>
      )}

      {!isSearching && searchQuery && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <TriangleAlert className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium mb-1">No results found</p>
          <p className="text-sm">Try searching for a different location</p>
        </div>
      )}

      {!isSearching && searchResults.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {searchResults.length} parking location{searchResults.length !== 1 ? "s" : ""}
            {searchResults[0]?.distanceKm !== undefined && (
              <span className="ml-2 font-medium">• Sorted by distance</span>
            )}
          </p>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {searchResults.map((lot) => {
              const { total, free } = getLotCounts(lot);
              const pct = getFreePct(lot); // null if no counts/total

              const level: AvailabilityLevel | "unknown" =
                pct === null ? "unknown" : availabilityLevelByFreePct(pct);

              const ui = levelUi(level);
              const kmText = formatKm((lot as any).distanceKm);

              const pricing = (lot as any).pricing ?? {};
              const rate = pricing?.rate ?? "—";
              const maxStay = pricing?.maxStay ?? "—";
              const openUntil = pricing?.openUntil ?? "—";

              return (
                <Card
                  key={String(lot.id)}
                  className={[
                    "p-4 transition-all",
                    "hover:shadow-md",
                    "ring-1 ring-border/60",
                    ui.cardRingClass,
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{lot.name}</h3>

                        <Badge
                          variant="secondary"
                          className={["gap-1 border", ui.badgeClass].join(" ")}
                        >
                          <ui.Icon className={["h-3 w-3", ui.iconClass].join(" ")} />
                          {ui.label}
                        </Badge>

                        {kmText && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {kmText} km
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{(lot as any).address ?? "—"}</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>{rate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Max: {maxStay}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Until: {openUntil}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center ml-4">
                      <div className="text-lg font-bold mb-1">{pct === null ? "—" : `${pct}%`}</div>
                      <div className="text-xs text-muted-foreground mb-1">free</div>
                      <div className="text-sm">{pct === null ? "—" : `${free} / ${total}`}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLotSelect(String(lot.id))}
                      className="flex-1"
                    >
                      View Details
                    </Button>
                    <Button size="sm" onClick={() => onNavigate(lot)} className="gap-2">
                      <Navigation className="h-3 w-3" />
                      Navigate
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!searchQuery && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium mb-1">Find Nearest Parking</p>
          <p className="text-sm mb-3">Enter an address to find the closest parking locations</p>
        </div>
      )}
    </Card>
  );
};
