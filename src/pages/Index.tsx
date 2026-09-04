// src/pages/Index.tsx

import { useOttawaLiveParking } from "@/hooks/useOttawaLiveParking";
import { useOttawaTrafficEvents } from "@/hooks/useOttawaTrafficEvents";
import type { OttawaDestinationResult } from "@/services/ottawaDestinationSearch";
import { useOttawaPaidStreetParking } from "@/hooks/useOttawaPaidStreetParking";
import LeafletParkingMap from "@/components/maps/LeafletParkingMap";
import { useOttawa15MinParking } from "@/hooks/useOttawa15MinParking";
import React, { useMemo, useState } from "react";
import { useParkingLots } from "@/hooks/useParkingLots";
import { useEnhancedLots } from "@/hooks/useEnhancedLots";
import { openGoogleMapsNavigation } from "@/utils/navigation";
import {
  ParkingHeader,
  type NearbyParkingItem,
  type NearbyParkingResult,
} from "@/components/parking/ParkingHeader";
import { ParkingControls } from "@/components/parking/ParkingControls";
import { ParkingLotDetailMap } from "@/components/parking/ParkingLotDetailMap";
import { ParkingDetail } from "@/components/parking/ParkingDetail";
import { ParkingList } from "@/components/parking/ParkingList";
import { useToast } from "@/hooks/use-toast";
import AIChat from "@/components/AIChat";
import type { ParkingLot } from "@/types/parking";

const normalizeAddress = (
  value: unknown
): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\broad\b/g, "rd")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\blane\b/g, "ln")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bplace\b/g, "pl")
    .replace(/\bterrace\b/g, "terr")
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const getLotAddress = (
  lot: any
): string => {
  return (
    lot?.address ??
    lot?.street_address ??
    lot?.location_address ??
    lot?.name ??
    ""
  );
};

const getLatitude = (
  lot: any
): number | null => {
  const value =
    lot?.latitude ??
    lot?.lat ??
    lot?.location?.lat ??
    lot?.location?.latitude;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const getLongitude = (
  lot: any
): number | null => {
  const value =
    lot?.longitude ??
    lot?.lng ??
    lot?.lon ??
    lot?.location?.lng ??
    lot?.location?.longitude;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const distanceInMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const earthRadius = 6371000;

  const toRadians = (
    degrees: number
  ) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(
    lat2 - lat1
  );

  const deltaLng = toRadians(
    lng2 - lng1
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
};

const getSegmentMidpoint = (
  coordinates: [number, number][]
): {
  lat: number;
  lng: number;
} | null => {
  if (!coordinates.length) {
    return null;
  }

  const first = coordinates[0];
  const last =
    coordinates[
      coordinates.length - 1
    ];

  if (!first || !last) {
    return null;
  }

  const lng =
    (Number(first[0]) +
      Number(last[0])) /
    2;

  const lat =
    (Number(first[1]) +
      Number(last[1])) /
    2;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return {
    lat,
    lng,
  };
};

const Index = () => {
  const {
    lots,
    allLots,
    selectedLotId,
    filters,
    isLoading,
    updateFilters,
    selectLot,
    clearSelectedLot,
    refreshData,
    getAvailabilityPercentage,
    error,
  } = useParkingLots() as any;

  const {
    segments: fifteenMinSegments,
  } = useOttawa15MinParking();

  const {
    segments: paidStreetSegments,
  } = useOttawaPaidStreetParking();

  const {
    lots: liveParkingLots,
    lastUpdated: liveParkingLastUpdated,
    error: liveParkingError,
  } = useOttawaLiveParking();

  const {
    activeCarEvents:
      activeTrafficEvents,
    lastUpdated:
      trafficEventsLastUpdated,
    error: trafficEventsError,
  } = useOttawaTrafficEvents();

  void trafficEventsError;

  // Enhance virtual/weather-based data first.
  const { enhancedLots } =
    useEnhancedLots(lots ?? []);

  // Choose the original/base list.
  const baseDisplayLots =
    useMemo(() => {
      if (
        Array.isArray(enhancedLots) &&
        enhancedLots.length
      ) {
        return enhancedLots;
      }

      if (
        Array.isArray(lots) &&
        lots.length
      ) {
        return lots;
      }

      if (
        Array.isArray(allLots) &&
        allLots.length
      ) {
        return allLots;
      }

      return [];
    }, [
      enhancedLots,
      lots,
      allLots,
    ]);

  /*
   * Merge official City live parking data
   * into our existing parking lots.
   *
   * Matching priority:
   * 1. Address
   * 2. Coordinates within 120 metres
   *
   * Lots with no City live match remain unchanged.
   */
  const displayLots =
    useMemo(() => {
      if (
        !Array.isArray(
          baseDisplayLots
        ) ||
        !baseDisplayLots.length
      ) {
        return [];
      }

      if (
        !Array.isArray(
          liveParkingLots
        ) ||
        !liveParkingLots.length
      ) {
        return baseDisplayLots;
      }

      const matchedCityIds =
        new Set<number>();

      const mergedBaseLots = (
        baseDisplayLots as any[]
      ).map((lot: any) => {
        const lotAddress =
          normalizeAddress(
            getLotAddress(lot)
          );

        let liveMatch =
          liveParkingLots.find(
            (liveLot) => {
              const liveAddress =
                normalizeAddress(
                  liveLot.address
                );

              if (
                !lotAddress ||
                !liveAddress
              ) {
                return false;
              }

              return (
                lotAddress ===
                  liveAddress ||
                lotAddress.includes(
                  liveAddress
                ) ||
                liveAddress.includes(
                  lotAddress
                )
              );
            }
          );

        /*
         * If the address did not match,
         * try geographic proximity.
         */
        if (!liveMatch) {
          const lotLat =
            getLatitude(lot);

          const lotLng =
            getLongitude(lot);

          if (
            lotLat !== null &&
            lotLng !== null
          ) {
            let closest:
              | (typeof liveParkingLots)[number]
              | undefined;

            let closestDistance =
              Infinity;

            for (
              const liveLot of liveParkingLots
            ) {
              const distance =
                distanceInMeters(
                  lotLat,
                  lotLng,
                  liveLot.latitude,
                  liveLot.longitude
                );

              if (
                distance <
                closestDistance
              ) {
                closest =
                  liveLot;

                closestDistance =
                  distance;
              }
            }

            /*
             * Parking lot coordinates
             * can point to different
             * entrances, so allow
             * a reasonable radius.
             */
            if (
              closest &&
              closestDistance <=
                120
            ) {
              liveMatch =
                closest;
            }
          }
        }

        if (!liveMatch) {
          return {
            ...lot,
            isLive: false,
          };
        }

        matchedCityIds.add(
          liveMatch.id
        );

        const liveCapacity =
          liveMatch.capacity;

        const liveFree =
          liveMatch.freeSpaces;

        /*
         * We only calculate true live
         * occupancy when BOTH capacity
         * and freeSpaces are available.
         */
        const hasLiveOccupancy =
          liveCapacity !== null &&
          liveCapacity > 0 &&
          liveFree !== null;

        const safeFree =
          hasLiveOccupancy
            ? Math.min(
                liveCapacity,
                Math.max(
                  0,
                  liveFree
                )
              )
            : null;

        const occupied =
          hasLiveOccupancy &&
          safeFree !== null
            ? Math.max(
                0,
                liveCapacity -
                  safeFree
              )
            : null;

        const availabilityPercentage =
          hasLiveOccupancy &&
          safeFree !== null
            ? Math.round(
                (safeFree /
                  liveCapacity) *
                  100
              )
            : null;

        const occupancyPercentage =
          hasLiveOccupancy &&
          occupied !== null
            ? Math.round(
                (occupied /
                  liveCapacity) *
                  100
              )
            : null;

        return {
          ...lot,

          // Official City live identifiers
          cityParkingId:
            liveMatch.id,

          cityLotId:
            liveMatch.lotId,

          // Mark data source
          isCityOfficial: true,

          isLive:
            hasLiveOccupancy,

          liveDataSource:
            "City of Ottawa",

          liveLastUpdated:
            liveParkingLastUpdated,

          liveDataError:
            liveParkingError,

          // Official values
          capacity:
            liveCapacity ??
            lot?.capacity ??
            lot?.total ??
            lot?.map_capacity,

          total:
            liveCapacity ??
            lot?.total ??
            lot?.capacity ??
            lot?.map_capacity,

          free:
            safeFree ??
            lot?.free ??
            lot?.available,

          available:
            safeFree ??
            lot?.available ??
            lot?.free,

          freeSpaces:
            safeFree,

          occupied:
            occupied ??
            lot?.occupied,

          liveAvailabilityPercentage:
            availabilityPercentage,

          liveOccupancyPercentage:
            occupancyPercentage,

          freeAccessibleSpaces:
            liveMatch.freeAccessibleSpaces,

          cityLiveAddress:
            liveMatch.address,

          cityLatitude:
            liveMatch.latitude,

          cityLongitude:
            liveMatch.longitude,

          coordinates: {
            lat:
              liveMatch.latitude,
            lng:
              liveMatch.longitude,
          },
        };
      });

      /*
       * Sprint 3:
       * Add official City lots that are not already
       * represented by an existing project lot.
       */
      const unmatchedCityLots =
        liveParkingLots
          .filter(
            (liveLot) =>
              !matchedCityIds.has(
                liveLot.id
              )
          )
          .map((liveLot) => {
            const liveCapacity =
              liveLot.capacity;

            const liveFree =
              liveLot.freeSpaces;

            const hasLiveOccupancy =
              liveCapacity !== null &&
              liveCapacity > 0 &&
              liveFree !== null;

            const safeFree =
              hasLiveOccupancy
                ? Math.min(
                    liveCapacity,
                    Math.max(
                      0,
                      liveFree
                    )
                  )
                : null;

            const occupied =
              hasLiveOccupancy &&
              safeFree !== null
                ? Math.max(
                    0,
                    liveCapacity -
                      safeFree
                  )
                : null;

            const availabilityPercentage =
              hasLiveOccupancy &&
              safeFree !== null
                ? Math.round(
                    (safeFree /
                      liveCapacity) *
                      100
                  )
                : null;

            const occupancyPercentage =
              hasLiveOccupancy &&
              occupied !== null
                ? Math.round(
                    (occupied /
                      liveCapacity) *
                      100
                  )
                : null;

            const cityAddress =
              liveLot.address?.trim() ||
              `City Parking Lot ${liveLot.lotId}`;

            return {
              id:
                `city-${liveLot.id}`,

              name:
                cityAddress,

              address:
                liveLot.address ??
                cityAddress,

              cityParkingId:
                liveLot.id,

              cityLotId:
                liveLot.lotId,

              isCityOfficial:
                true,

              isLive:
                hasLiveOccupancy,

              liveDataSource:
                "City of Ottawa",

              liveLastUpdated:
                liveParkingLastUpdated,

              liveDataError:
                liveParkingError,

              capacity:
                liveCapacity ?? 0,

              total:
                liveCapacity ?? 0,

              map_capacity:
                liveCapacity ?? 0,

              free:
                safeFree,

              available:
                safeFree,

              freeSpaces:
                safeFree,

              occupied,

              liveAvailabilityPercentage:
                availabilityPercentage,

              liveOccupancyPercentage:
                occupancyPercentage,

              freeAccessibleSpaces:
                liveLot.freeAccessibleSpaces,

              cityLiveAddress:
                liveLot.address,

              cityLatitude:
                liveLot.latitude,

              cityLongitude:
                liveLot.longitude,

              type:
                liveLot.type,

              coordinates: {
                lat:
                  liveLot.latitude,
                lng:
                  liveLot.longitude,
              },
            } as any;
          });

      return [
        ...mergedBaseLots,
        ...unmatchedCityLots,
      ];
    }, [
      baseDisplayLots,
      liveParkingLots,
      liveParkingLastUpdated,
      liveParkingError,
    ]);

  /*
   * Sprint 3 — Unified Parking Near You
   *
   * The existing Near You button now searches:
   * - project parking lots
   * - official City lots
   * - 15-minute free segments
   * - paid street parking segments
   */
  const nearbyParkingItems:
    NearbyParkingItem[] =
    useMemo(() => {
      const lotItems:
        NearbyParkingItem[] =
        (displayLots as any[])
          .map((lot: any) => {
            const lat =
              getLatitude(lot);

            const lng =
              getLongitude(lot);

            if (
              lat === null ||
              lng === null
            ) {
              return null;
            }

            return {
              id: `lot-${String(
                lot.id
              )}`,
              lotId: String(
                lot.id
              ),
              name:
                lot?.name ??
                lot?.address ??
                "Parking Lot",
              kind: "lot" as const,
              groupKey:
                `lot-${String(
                  lot.id
                )}`,
              isLive:
                lot?.isLive === true,
              isCityOfficial:
                lot?.isCityOfficial ===
                  true,
              freeSpaces:
                typeof lot?.free ===
                  "number"
                  ? lot.free
                  : typeof lot
                        ?.freeSpaces ===
                      "number"
                  ? lot.freeSpaces
                  : null,
              capacity:
                Number.isFinite(
                  Number(
                    lot?.capacity ??
                      lot?.total ??
                      lot?.map_capacity
                  )
                )
                  ? Number(
                      lot?.capacity ??
                        lot?.total ??
                        lot?.map_capacity
                    )
                  : null,
              coordinates: {
                lat,
                lng,
              },
            };
          })
          .filter(
            (
              item
            ): item is NearbyParkingItem =>
              item !== null
          );

      const fifteenItems:
        NearbyParkingItem[] =
        fifteenMinSegments
          .map((segment) => {
            const midpoint =
              getSegmentMidpoint(
                segment.coordinates
              );

            if (!midpoint) {
              return null;
            }

            return {
              id: `15min-${String(
                segment.id
              )}`,
              name:
                "15 Minute Free Parking",
              kind: "15min" as const,
              groupKey:
                `15min-${midpoint.lat.toFixed(
                  3
                )}-${midpoint.lng.toFixed(
                  3
                )}`,
              coordinates:
                midpoint,
            };
          })
          .filter(
            (
              item
            ): item is NearbyParkingItem =>
              item !== null
          );

      const paidItems:
        NearbyParkingItem[] =
        paidStreetSegments
          .map((segment) => {
            const midpoint =
              getSegmentMidpoint(
                segment.coordinates
              );

            if (!midpoint) {
              return null;
            }

            const road =
              typeof segment.road ===
                "string" &&
              segment.road.trim()
                ? segment.road.trim()
                : null;

            const hourlyRate =
              segment.hourlyRate;

            const rateNumber =
              hourlyRate !== null &&
              hourlyRate !== undefined &&
              hourlyRate !== ""
                ? Number(hourlyRate)
                : null;

            const rateLabel =
              rateNumber !== null &&
              Number.isFinite(rateNumber)
                ? `$${rateNumber.toFixed(
                    Number.isInteger(
                      rateNumber
                    )
                      ? 0
                      : 2
                  )}/hr`
                : null;

            return {
              id: `paid-${String(
                segment.id
              )}`,
              name: road
                ? `Paid Parking · ${road}`
                : "Paid Street Parking",
              kind: "paid" as const,
              groupKey: road
                ? `paid-${road
                    .toLowerCase()
                    .replace(
                      /\s+/g,
                      " "
                    )
                    .trim()}`
                : `paid-${String(
                    segment.id
                  )}`,
              rateLabel,
              coordinates:
                midpoint,
            };
          })
          .filter(
            (
              item
            ): item is NearbyParkingItem =>
              item !== null
          );

      return [
        ...lotItems,
        ...fifteenItems,
        ...paidItems,
      ];
    }, [
      displayLots,
      fifteenMinSegments,
      paidStreetSegments,
    ]);

  const selectedLotEnhanced =
    useMemo(() => {
      if (!selectedLotId) {
        return null;
      }

      return (
        (displayLots as any[]).find(
          (lot: any) =>
            String(lot?.id) ===
            String(selectedLotId)
        ) ?? null
      );
    }, [
      displayLots,
      selectedLotId,
    ]);

  const [activeTab, setActiveTab] =
    useState("overview");

  const [
    nearbyFocus,
    setNearbyFocus,
  ] = useState<{
    lat: number;
    lng: number;
    kind:
      | "lot"
      | "15min"
      | "paid";
    targetId: string;
    requestId: number;
  } | null>(null);

  const [
    userLocation,
    setUserLocation,
  ] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [
    selectedDestination,
    setSelectedDestination,
  ] = useState<
    OttawaDestinationResult | null
  >(null);

  const { toast } = useToast();

  const handleNavigate = (
    lot: any
  ) => {
    try {
      openGoogleMapsNavigation(
        lot
      );

      toast({
        title:
          "Opening Navigation",

        description: `Directing you to ${
          lot?.name ??
          "the selected lot"
        } via Google Maps`,

        duration: 3000,
      });
    } catch {
      toast({
        title:
          "Navigation Error",

        description:
          "Could not open Google Maps. Please try again.",

        variant:
          "destructive",

        duration: 3000,
      });
    }
  };

  const handleDestinationSelect = (
    destination: OttawaDestinationResult
  ) => {
    setSelectedDestination(
      destination
    );

    clearSelectedLot();

    setActiveTab(
      "overview"
    );
  };

  return (
    <div className="app-parking-bg">
      <div className="app-content min-h-screen">
        <ParkingHeader
          onRefresh={
            refreshData
          }
          isLoading={
            isLoading
          }
          nearbyItems={
            nearbyParkingItems
          }
          onDestinationSelect={
            handleDestinationSelect
          }
          onUserLocation={(
            location
          ) => {
            setUserLocation(
              location
            );
          }}
          onFindNearby={(
            nearbyResults:
              NearbyParkingResult[]
          ) => {
            const first =
              nearbyResults?.[0];

            if (!first) {
              return;
            }

            /*
             * Keep the main map visible for every
             * nearby result type, then fly to the
             * selected item and open its popup.
             */
            clearSelectedLot();

            setNearbyFocus({
              lat:
                first.coordinates.lat,
              lng:
                first.coordinates.lng,
              kind:
                first.kind,
              targetId:
                first.id,
              requestId:
                Date.now(),
            });

            setActiveTab(
              "overview"
            );
          }}
        />

        <main className="container mx-auto px-4 py-6 pb-24">
          <ParkingControls
            filters={
              filters
            }
            onFiltersChange={
              updateFilters
            }
          />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {selectedLotId && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={
                          clearSelectedLot
                        }
                        className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center gap-2"
                        aria-label="Back to overview"
                      >
                        <span className="mr-2">
                          &larr;
                        </span>

                        Back to Overview
                      </button>
                    </div>
                  )}

                  {selectedLotEnhanced ? (
                    <ParkingLotDetailMap
                      lot={
                        selectedLotEnhanced
                      }
                    />
                  ) : (
                    <LeafletParkingMap
                      lots={
                        displayLots
                      }
                      fifteenMinSegments={
                        fifteenMinSegments
                      }
                      paidStreetSegments={
                        paidStreetSegments
                      }
                      liveParkingLastUpdated={
                        liveParkingLastUpdated
                      }
                      trafficEvents={
                        activeTrafficEvents
                      }
                      trafficEventsLastUpdated={
                        trafficEventsLastUpdated
                      }
                      focusLocation={
                        nearbyFocus
                      }
                      userLocation={
                        userLocation
                      }
                      destination={
                        selectedDestination
                      }
                      selectedLotId={String(
                        selectedLotId ??
                          ""
                      )}
                      onLotSelect={
                        selectLot
                      }
                    />
                  )}
                </div>

                <div className="space-y-6">
                  {selectedLotEnhanced && (
                    <ParkingDetail
                      lot={
                        selectedLotEnhanced
                      }
                      availabilityPercentage={getAvailabilityPercentage(
                        selectedLotEnhanced
                      )}
                      onNavigate={
                        handleNavigate
                      }
                    />
                  )}

                  <ParkingList
                    lots={
                      displayLots
                    }
                    selectedLotId={String(
                      selectedLotId ??
                        ""
                    )}
                    onLotSelect={
                      selectLot
                    }
                  />
                </div>
              </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 glass-effect border-t z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                © Ottawa Live Parking 2026
              </div>
            </div>
          </div>
        </footer>

        <AIChat />
      </div>
    </div>
  );
};

export default Index;