import { Button } from "@/components/ui/button";
import { Moon, Sun, RefreshCw, MapPin, X, Search, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { calculateDistance } from "@/utils/distance";
import { searchOttawaDestinations, type OttawaDestinationResult } from "@/services/ottawaDestinationSearch";

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
  onUserLocation?: (location: {
    lat: number;
    lng: number;
  }) => void;
  onDestinationSelect?: (
    destination: OttawaDestinationResult
  ) => void;
}

export const ParkingHeader = ({
  onRefresh,
  isLoading,
  onFindNearby,
  nearbyItems,
  onUserLocation,
  onDestinationSelect,
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

  const [
    nearbyMobileCollapsed,
    setNearbyMobileCollapsed,
  ] = useState(false);

  const [
    destinationQuery,
    setDestinationQuery,
  ] = useState("");

  const [
    destinationResults,
    setDestinationResults,
  ] = useState<
    OttawaDestinationResult[]
  >([]);

  const [
    destinationLoading,
    setDestinationLoading,
  ] = useState(false);

  const [
    showDestinationResults,
    setShowDestinationResults,
  ] = useState(false);

  const destinationAbortRef =
    useRef<AbortController | null>(
      null
    );

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
    setNearbyMobileCollapsed(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        // Isolated Sprint 3 addition:
        // expose the already-approved browser
        // location without changing nearby logic.
        onUserLocation?.({
          lat: latitude,
          lng: longitude,
        });

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

  useEffect(() => {
    const cleanQuery =
      destinationQuery.trim();

    if (cleanQuery.length < 3) {
      destinationAbortRef.current?.abort();
      setDestinationResults([]);
      setDestinationLoading(false);
      return;
    }

    const timeoutId =
      window.setTimeout(async () => {
        destinationAbortRef.current?.abort();

        const controller =
          new AbortController();

        destinationAbortRef.current =
          controller;

        setDestinationLoading(true);

        try {
          const results =
            await searchOttawaDestinations(
              cleanQuery,
              {
                limit: 6,
                signal:
                  controller.signal,
              }
            );

          if (!controller.signal.aborted) {
            setDestinationResults(
              results
            );
            setShowDestinationResults(
              true
            );
          }
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          setDestinationResults([]);
        } finally {
          if (!controller.signal.aborted) {
            setDestinationLoading(
              false
            );
          }
        }
      }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [destinationQuery]);

  useEffect(() => {
    return () => {
      destinationAbortRef.current?.abort();
    };
  }, []);

  const handleDestinationSelect = (
    destination: OttawaDestinationResult
  ) => {
    setDestinationQuery(
      destination.address
    );
    setDestinationResults([]);
    setShowDestinationResults(false);
    onDestinationSelect?.(
      destination
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

        <div className="relative mx-auto mt-3 w-full max-w-3xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="search"
              value={destinationQuery}
              onChange={(event) => {
                setDestinationQuery(
                  event.target.value
                );
                setShowDestinationResults(
                  true
                );
              }}
              onFocus={() => {
                if (
                  destinationResults.length
                ) {
                  setShowDestinationResults(
                    true
                  );
                }
              }}
              placeholder="Where are you going?"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-10 text-sm shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              aria-label="Search destination in Ottawa"
              autoComplete="off"
            />

            {destinationLoading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : destinationQuery ? (
              <button
                type="button"
                aria-label="Clear destination search"
                onClick={() => {
                  setDestinationQuery("");
                  setDestinationResults([]);
                  setShowDestinationResults(
                    false
                  );
                }}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {showDestinationResults &&
            destinationQuery.trim().length >=
              3 && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[90] overflow-hidden rounded-xl border bg-background shadow-2xl">
                {destinationResults.length >
                0 ? (
                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {destinationResults.map(
                      (destination) => (
                        <button
                          key={
                            destination.id
                          }
                          type="button"
                          onClick={() =>
                            handleDestinationSelect(
                              destination
                            )
                          }
                          className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent"
                        >
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                              {
                                destination.label
                              }
                            </div>

                            {destination.address !==
                              destination.label && (
                              <div className="truncate text-xs text-muted-foreground">
                                {
                                  destination.address
                                }
                              </div>
                            )}
                          </div>

                        </button>
                      )
                    )}
                  </div>
                ) : !destinationLoading ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No matching Ottawa address found.
                  </div>
                ) : null}
              </div>
            )}
        </div>

        {showNearbyResults &&
          nearbyResults.length > 0 && (
            <>
              {/* Desktop / tablet: keep the current dropdown design. */}
              <div className="absolute right-4 top-[calc(100%+8px)] z-[70] hidden w-[min(92vw,380px)] rounded-2xl border bg-background/95 p-3 shadow-2xl backdrop-blur sm:block">
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

              {/* Mobile:
                  render outside the sticky header using a portal.
                  Safari can treat fixed children of backdrop-filter
                  containers as header-relative, which caused the
                  broken layout seen on iPhone. */}
              {typeof document !==
                "undefined" &&
                createPortal(
                  <>
                    {!nearbyMobileCollapsed ? (
                      <>
                        <button
                          type="button"
                          aria-label="Close nearby parking"
                          className="fixed inset-0 z-[110] bg-black/20 sm:hidden"
                          onClick={() =>
                            setShowNearbyResults(
                              false
                            )
                          }
                        />

                        <div className="fixed inset-x-0 bottom-0 z-[120] sm:hidden">
                          <div className="mx-auto flex max-h-[58svh] w-full flex-col overflow-hidden rounded-t-[24px] border border-b-0 bg-background shadow-[0_-12px_40px_rgba(15,23,42,0.24)]">
                            <div className="shrink-0 border-b bg-background px-4 pb-3 pt-2">
                              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted-foreground/25" />

                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-base font-bold">
                                    Parking Near You
                                  </div>

                                  <div className="text-xs text-muted-foreground">
                                    {nearbyResults.length} nearby option{nearbyResults.length === 1 ? "" : "s"} within 2 km
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 rounded-full"
                                  onClick={() =>
                                    setShowNearbyResults(
                                      false
                                    )
                                  }
                                  aria-label="Close nearby parking"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>

                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(14px+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
                              {nearbyResults.map(
                                (
                                  result,
                                  index
                                ) => {
                                  const isFree =
                                    result.kind ===
                                    "15min";

                                  const isPaid =
                                    result.kind ===
                                    "paid";

                                  return (
                                    <button
                                      key={
                                        result.id
                                      }
                                      type="button"
                                      onClick={() => {
                                        onFindNearby(
                                          [
                                            result,
                                          ]
                                        );

                                        setNearbyMobileCollapsed(
                                          true
                                        );
                                      }}
                                      className="flex w-full items-center gap-3 rounded-2xl border bg-card px-3 py-3 text-left active:bg-accent"
                                    >
                                      <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white ${
                                          isFree
                                            ? "bg-green-600"
                                            : isPaid
                                            ? "bg-blue-600"
                                            : "bg-slate-800"
                                        }`}
                                      >
                                        {index +
                                          1}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-[14px] font-semibold leading-5">
                                          {
                                            result.name
                                          }
                                        </div>

                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                          <span>
                                            {getTypeLabel(
                                              result.kind
                                            )}
                                          </span>

                                          {result.isLive && (
                                            <>
                                              <span>
                                                ·
                                              </span>
                                              <span className="font-bold text-green-600 dark:text-green-400">
                                                LIVE
                                              </span>
                                            </>
                                          )}

                                          {result.rateLabel && (
                                            <>
                                              <span>
                                                ·
                                              </span>
                                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                {
                                                  result.rateLabel
                                                }
                                              </span>
                                            </>
                                          )}

                                          <span>
                                            ·
                                          </span>

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
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setNearbyMobileCollapsed(
                            false
                          )
                        }
                        className="fixed bottom-[calc(14px+env(safe-area-inset-bottom))] left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border bg-background/95 px-4 py-2.5 text-sm font-semibold shadow-xl backdrop-blur sm:hidden"
                      >
                        <MapPin className="h-4 w-4 text-green-600" />
                        Nearby ·{" "}
                        {
                          nearbyResults.length
                        }
                        <span className="text-muted-foreground">
                          ↑
                        </span>
                      </button>
                    )}
                  </>,
                  document.body
                )}
            </>
          )}

      </div>
    </header>
  );
};
