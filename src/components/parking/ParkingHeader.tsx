import { Button } from "@/components/ui/button";
import { Moon, Sun, RefreshCw, MapPin, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { calculateDistance } from "@/utils/distance";

export type NearbyParkingKind =
  | "lot"
  | "15min"
  | "paid";

export type NearbyParkingItem = {
  id: string;
  name: string;
  kind: NearbyParkingKind;
  coordinates: {
    lat: number;
    lng: number;
  };
  lotId?: string;
  groupKey?: string;
  rateLabel?: string | null;
  isLive?: boolean;
  isCityOfficial?: boolean;
  freeSpaces?: number | null;
  capacity?: number | null;
};

export type NearbyParkingResult =
  NearbyParkingItem & {
    distanceKm: number;
  };

interface ParkingHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onFindNearby: (
    nearbyItems: NearbyParkingResult[]
  ) => void;
  nearbyItems: NearbyParkingItem[];
}

export const ParkingHeader = ({
  onRefresh,
  isLoading,
  onFindNearby,
  nearbyItems,
}: ParkingHeaderProps) => {
  const { theme, setTheme } = useTheme();

  const [
    isGettingLocation,
    setIsGettingLocation,
  ] = useState(false);

  const [
    nearbyResults,
    setNearbyResults,
  ] = useState<
    NearbyParkingResult[]
  >([]);

  const [
    showNearbyResults,
    setShowNearbyResults,
  ] = useState(false);

  const { toast } = useToast();

  const formatDistance = (
    distanceKm: number
  ) =>
    distanceKm < 1
      ? `${Math.round(
          distanceKm * 1000
        )} m`
      : `${distanceKm.toFixed(
          1
        )} km`;

  const getTypeLabel = (
    kind: NearbyParkingKind
  ) =>
    kind === "15min"
      ? "15 Min Free"
      : kind === "paid"
      ? "Paid Street"
      : "Parking Lot";

  const handleFindNearby = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description:
          "Your browser doesn't support location services",
        variant: "destructive",
        duration: 3000,
      });

      return;
    }

    if (!nearbyItems.length) {
      toast({
        title: "Parking Data Unavailable",
        description:
          "No parking locations are currently available to search.",
        variant: "destructive",
        duration: 3000,
      });

      return;
    }

    setIsGettingLocation(true);
    setShowNearbyResults(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        const itemsWithDistance =
          nearbyItems
            .filter((item) => {
              const lat = Number(
                item.coordinates?.lat
              );

              const lng = Number(
                item.coordinates?.lng
              );

              return (
                Number.isFinite(lat) &&
                Number.isFinite(lng)
              );
            })
            .map((item) => ({
              ...item,

              distanceKm:
                calculateDistance(
                  latitude,
                  longitude,
                  item.coordinates.lat,
                  item.coordinates.lng
                ),
            }));

        /*
         * Smart Nearby Ranking
         *
         * 1. Collapse repeated nearby street
         *    segments into one useful choice.
         * 2. Keep the closest member of each group.
         * 3. Distance stays the main factor, with
         *    a small preference for LIVE and free
         *    15-minute parking when similarly close.
         */
        const closestByGroup =
          new Map<
            string,
            NearbyParkingResult
          >();

        for (
          const item of itemsWithDistance
        ) {
          const key =
            item.groupKey ??
            item.id;

          const current =
            closestByGroup.get(key);

          if (
            !current ||
            item.distanceKm <
              current.distanceKm
          ) {
            closestByGroup.set(
              key,
              item
            );
          }
        }

        const smartScore = (
          item: NearbyParkingResult
        ) => {
          let bonusKm = 0;

          if (item.isLive) {
            bonusKm += 0.08;
          }

          if (
            item.kind === "15min"
          ) {
            bonusKm += 0.04;
          }

          return (
            item.distanceKm -
            bonusKm
          );
        };

        const nearby =
          Array.from(
            closestByGroup.values()
          )
            .sort((a, b) => {
              const scoreDiff =
                smartScore(a) -
                smartScore(b);

              if (
                Math.abs(scoreDiff) >
                0.001
              ) {
                return scoreDiff;
              }

              return (
                a.distanceKm -
                b.distanceKm
              );
            })
            .filter(
              (item) =>
                item.distanceKm <= 2
            )
            .slice(0, 5);

        setIsGettingLocation(false);

        if (!nearby.length) {
          toast({
            title:
              "No Nearby Parking Found",
            description:
              "Parking data is available, but no valid map locations could be used.",
            variant: "destructive",
            duration: 3500,
          });

          return;
        }

        setNearbyResults(nearby);
        setShowNearbyResults(true);

        toast({
          title: "Nearby Parking Ready",
          description: `Found ${nearby.length} closest parking options.`,
          duration: 3000,
        });
      },
      (error) => {
        setIsGettingLocation(false);

        let errorMessage =
          "Could not get your location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please enable location services";
            break;

          case error.POSITION_UNAVAILABLE:
            errorMessage =
              "Location information unavailable";
            break;

          case error.TIMEOUT:
            errorMessage =
              "Location request timed out";
            break;
        }

        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
          duration: 4000,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-50 glass-effect border-b">
      <div className="container mx-auto px-4 py-3 relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-parking-ring to-blue-500 flex items-center justify-center">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-parking-available to-parking-ring" />
              </div>

              <button
                onClick={() =>
                  (window.location.href =
                    "/")
                }
                className="absolute -bottom-1 -right-1 bg-parking-available text-white text-xs px-1.5 py-0.5 rounded-md font-semibold cursor-pointer"
              >
                LIVE
              </button>
            </div>

            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">
                Ottawa Live Parking
              </h1>

              <p className="text-sm text-muted-foreground truncate">
                Real-time parking availability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="default"
              size="sm"
              onClick={handleFindNearby}
              disabled={isGettingLocation}
              className="gap-2 bg-parking-available hover:bg-parking-available/90"
            >
              <MapPin
                className={`h-4 w-4 ${
                  isGettingLocation
                    ? "animate-pulse"
                    : ""
                }`}
              />

              <span className="hidden sm:inline">
                {isGettingLocation
                  ? "Getting Location..."
                  : "Parking Near You"}
              </span>

              <span className="sm:hidden">
                {isGettingLocation
                  ? "Locating..."
                  : "Nearby"}
              </span>
            </Button>

            <div className="glass-effect rounded-xl px-3 py-2 hidden md:block">
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="status-dot-available w-2 h-2 rounded-full" />
                  <span>
                    Available (✓)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="status-dot-busy w-2 h-2 rounded-full" />
                  <span>
                    Busy (✗)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isLoading
                      ? "animate-spin"
                      : ""
                  }`}
                />

                <span className="hidden sm:inline">
                  Refresh
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setTheme(
                    isDark
                      ? "light"
                      : "dark"
                  )
                }
                className="gap-2"
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}

                <span className="hidden sm:inline">
                  Theme
                </span>
              </Button>
            </div>
          </div>
        </div>

        {showNearbyResults &&
          nearbyResults.length > 0 && (
            <div className="absolute right-4 top-[calc(100%+8px)] z-[70] w-[min(92vw,380px)] rounded-2xl border bg-background/95 p-3 shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold">
                    Parking Near You
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Best nearby options within 2 km
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    setShowNearbyResults(
                      false
                    )
                  }
                  aria-label="Close nearby parking"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {nearbyResults.map(
                  (result, index) => {
                    const isFree =
                      result.kind ===
                      "15min";

                    const isPaid =
                      result.kind ===
                      "paid";

                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => {
                          /*
                           * Keep the Nearby Results
                           * panel open while focusing
                           * the selected parking item.
                           */
                          onFindNearby([
                            result,
                          ]);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white ${
                            isFree
                              ? "bg-green-600"
                              : isPaid
                              ? "bg-blue-600"
                              : "bg-slate-800"
                          }`}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {result.name}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>
                              {getTypeLabel(
                                result.kind
                              )}
                            </span>

                            {result.isLive && (
                              <>
                                <span>·</span>
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  LIVE
                                </span>
                              </>
                            )}

                            {result.rateLabel && (
                              <>
                                <span>·</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {result.rateLabel}
                                </span>
                              </>
                            )}

                            {result.isLive &&
                              typeof result.freeSpaces ===
                                "number" &&
                              typeof result.capacity ===
                                "number" &&
                              result.capacity > 0 && (
                                <>
                                  <span>·</span>
                                  <span>
                                    {result.freeSpaces} free
                                  </span>
                                </>
                              )}

                            <span>·</span>

                            <span className="font-semibold text-foreground">
                              {formatDistance(
                                result.distanceKm
                              )}
                            </span>
                          </div>
                        </div>

                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
      </div>
    </header>
  );
};
