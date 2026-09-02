// src/pages/Index.tsx

import { useOttawaLiveParking } from "@/hooks/useOttawaLiveParking";
import { useOttawaPaidStreetParking } from "@/hooks/useOttawaPaidStreetParking";
import LeafletParkingMap from "@/components/maps/LeafletParkingMap";
import { useOttawa15MinParking } from "@/hooks/useOttawa15MinParking";
import React, { useMemo, useState } from "react";
import { useParkingLots } from "@/hooks/useParkingLots";
import { useEnhancedLots } from "@/hooks/useEnhancedLots";
import { openGoogleMapsNavigation } from "@/utils/navigation";
import { ParkingHeader } from "@/components/parking/ParkingHeader";
import { ParkingControls } from "@/components/parking/ParkingControls";
import { ParkingLotDetailMap } from "@/components/parking/ParkingLotDetailMap";
import { ParkingDetail } from "@/components/parking/ParkingDetail";
import { ParkingList } from "@/components/parking/ParkingList";
import { SearchResults } from "@/components/parking/SearchResults";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AIChat from "@/components/AIChat";
import ParkingCardsList from "@/components/parking/ParkingCardsList";
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
    searchLots,
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

      return (
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
        };
      });
    }, [
      baseDisplayLots,
      liveParkingLots,
      liveParkingLastUpdated,
      liveParkingError,
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

  /*
   * Cards adapter.
   *
   * Because displayLots now contains
   * City live values where available,
   * cards automatically use live
   * capacity/free-space data.
   */
  const cardsLots: ParkingLot[] =
    useMemo(() => {
      const base =
        (displayLots as any[]) ??
        [];

      return base.map(
        (lot: any) => {
          const id =
            lot?.id;

          const name =
            lot?.name ??
            "Unknown";

          const capacity =
            Number(
              lot?.capacity ??
                lot?.total ??
                lot?.map_capacity ??
                0
            );

          const free =
            typeof lot?.free ===
            "number"
              ? Math.max(
                  0,
                  lot.free
                )
              : typeof lot
                    ?.available ===
                  "number"
              ? Math.max(
                  0,
                  lot.available
                )
              : Math.max(
                  0,
                  capacity -
                    Number(
                      lot?.occupied ??
                        0
                    )
                );

          const confidence =
            Number(
              lot?.confidence ??
                lot?.conf ??
                0
            );

          return {
            id,
            name,

            status:
              lot?.status ??
              null,

            free,

            total:
              capacity || 0,

            conf:
              Math.round(
                confidence *
                  100
              ),
          } as ParkingLot;
        }
      );
    }, [displayLots]);

  const availableOnly =
    Boolean(
      (filters as any)
        ?.onlyAvailable
    );

  const handleCardClick = (
    lot: ParkingLot
  ) => {
    if (!lot?.id) {
      return;
    }

    selectLot(
      String(lot.id)
    );

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
          onFindNearby={(
            nearbyLots
          ) => {
            const first =
              nearbyLots?.[0];

            const firstId =
              first?.id;

            if (firstId) {
              selectLot(
                String(firstId)
              );

              setActiveTab(
                "overview"
              );
            }
          }}
          allLots={
            allLots
          }
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

          <Tabs
            value={
              activeTab
            }
            onValueChange={
              setActiveTab
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">
                Parking Overview
              </TabsTrigger>

              <TabsTrigger value="search">
                Search Locations
              </TabsTrigger>

              <TabsTrigger value="cards">
                Cards
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="overview"
              className="space-y-0"
            >
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
            </TabsContent>

            <TabsContent
              value="search"
              className="space-y-0"
            >
              <SearchResults
                onSearch={
                  searchLots
                }
                onLotSelect={(
                  lotId
                ) => {
                  selectLot(
                    String(
                      lotId
                    )
                  );

                  setActiveTab(
                    "overview"
                  );
                }}
                onNavigate={
                  handleNavigate
                }
              />
            </TabsContent>

            <TabsContent
              value="cards"
              className="space-y-0"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <ParkingCardsList
                    lots={
                      cardsLots
                    }
                    isLoading={
                      isLoading
                    }
                    error={
                      error ??
                      null
                    }
                    availableOnly={
                      availableOnly
                    }
                    onCardClick={
                      handleCardClick
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 glass-effect border-t z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                © Ottawa Live Parking 2025
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