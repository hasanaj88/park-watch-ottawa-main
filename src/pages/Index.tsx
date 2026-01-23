// src/pages/Index.tsx
import React, { useMemo, useState } from "react";
import { useParkingLots } from "@/hooks/useParkingLots";
import { useEnhancedLots } from "@/hooks/useEnhancedLots";
import { openGoogleMapsNavigation } from "@/utils/navigation";
import { ParkingHeader } from "@/components/parking/ParkingHeader";
import { ParkingControls } from "@/components/parking/ParkingControls";
import { ParkingMap } from "@/components/parking/ParkingMap";
import { ParkingLotDetailMap } from "@/components/parking/ParkingLotDetailMap";
import { ParkingDetail } from "@/components/parking/ParkingDetail";
import { ParkingList } from "@/components/parking/ParkingList";
import { SearchResults } from "@/components/parking/SearchResults";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AIChat from "@/components/AIChat";
import ParkingCardsList from "@/components/parking/ParkingCardsList";
import type { ParkingLot } from "@/types/parking";


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

  // Enhance only virtual (weather-based) on top of the base lots list.
  const { enhancedLots } = useEnhancedLots(lots ?? []);


  // Choose the best list to render across the whole page.
  const displayLots = useMemo(() => {
    if (Array.isArray(enhancedLots) && enhancedLots.length) return enhancedLots;
    if (Array.isArray(lots) && lots.length) return lots;
    if (Array.isArray(allLots) && allLots.length) return allLots;
    return [];
  }, [enhancedLots, lots, allLots]);

  const selectedLotEnhanced = useMemo(() => {
    if (!selectedLotId) return null;
    return (
      (displayLots as any[]).find((l: any) => String(l?.id) === String(selectedLotId)) ?? null
    );
  }, [displayLots, selectedLotId]);

  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const handleNavigate = (lot: any) => {
    try {
      openGoogleMapsNavigation(lot);
      toast({
        title: "Opening Navigation",
        description: `Directing you to ${lot?.name ?? "the selected lot"} via Google Maps`,
        duration: 3000,
      });
    } catch {
      toast({
        title: "Navigation Error",
        description: "Could not open Google Maps. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Cards adapter (works with any lot shape)
  const cardsLots: ParkingLot[] = useMemo(() => {
    const base = (displayLots as any[]) ?? [];

    return base.map((lot: any) => {
      const id = lot?.id;
      const name = lot?.name ?? "Unknown";

      const capacity = Number(lot?.capacity ?? lot?.total ?? lot?.map_capacity ?? 0);

      const free =
        typeof lot?.free === "number"
          ? Math.max(0, lot.free)
          : typeof lot?.available === "number"
          ? Math.max(0, lot.available)
          : Math.max(0, capacity - Number(lot?.occupied ?? 0));

      const confidence = Number(lot?.confidence ?? lot?.conf ?? 0);

      return {
        id,
        name,
        status: lot?.status ?? null,
        free,
        total: capacity || 0,
        conf: Math.round(confidence * 100),
      } as ParkingLot;
    });
  }, [displayLots]);

  const availableOnly = Boolean((filters as any)?.onlyAvailable);

  const handleCardClick = (lot: ParkingLot) => {
    if (!lot?.id) return;
    selectLot(String(lot.id));
    setActiveTab("overview");
  };
return (
  <div className="app-parking-bg">
    <div className="app-content min-h-screen">
      <ParkingHeader
        onRefresh={refreshData}
        isLoading={isLoading}
        onFindNearby={(nearbyLots) => {
          const first = nearbyLots?.[0];
          const firstId = first?.id;
          if (firstId) {
            selectLot(String(firstId));
            setActiveTab("overview");
          }
        }}
        allLots={allLots}
      />

      <main className="container mx-auto px-4 py-6 pb-24">
        <ParkingControls filters={filters} onFiltersChange={updateFilters} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Parking Overview</TabsTrigger>
            <TabsTrigger value="search">Search Locations</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {selectedLotId && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearSelectedLot}
                      className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center gap-2"
                      aria-label="Back to overview"
                    >
                      <span className="mr-2">&larr;</span>
                      Back to Overview
                    </button>
                  </div>
                )}

                {selectedLotEnhanced ? (
                  <ParkingLotDetailMap lot={selectedLotEnhanced} />
                ) : (
                  <ParkingMap
                    lots={displayLots}
                    selectedLotId={selectedLotId}
                    onLotSelect={selectLot}
                  />
                )}
              </div>

              <div className="space-y-6">
                {selectedLotEnhanced && (
                  <ParkingDetail
                    lot={selectedLotEnhanced}
                    availabilityPercentage={getAvailabilityPercentage(selectedLotEnhanced)}
                    onNavigate={handleNavigate}
                  />
                )}

                <ParkingList
                  lots={displayLots}
                  selectedLotId={String(selectedLotId ?? "")}
                  onLotSelect={selectLot}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-0">
            <SearchResults
              onSearch={searchLots}
              onLotSelect={(lotId) => {
                selectLot(String(lotId));
                setActiveTab("overview");
              }}
              onNavigate={handleNavigate}
            />
          </TabsContent>

          <TabsContent value="cards" className="space-y-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ParkingCardsList
                  lots={cardsLots}
                  isLoading={isLoading}
                  error={error ?? null}
                  availableOnly={availableOnly}
                  onCardClick={handleCardClick}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 glass-effect border-t z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>© Ottawa Live Parking 2025</div>
          </div>
        </div>
      </footer>

      <AIChat />
    </div>
  </div>
);
};
export default Index;
