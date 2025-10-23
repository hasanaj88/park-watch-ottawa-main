import React, { useState } from 'react';
import { useParkingData } from '@/hooks/useParkingData';
import { openGoogleMapsNavigation } from '@/utils/navigation';
import { ParkingHeader } from '@/components/parking/ParkingHeader';
import { ParkingControls } from '@/components/parking/ParkingControls';
import { ParkingMap } from '@/components/parking/ParkingMap';
import { ParkingLotDetailMap } from '@/components/parking/ParkingLotDetailMap';
import { ParkingDetail } from '@/components/parking/ParkingDetail';
import { ParkingList } from '@/components/parking/ParkingList';
import { SearchResults } from '@/components/parking/SearchResults';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AIChat } from '@/components/AIChat';

const Index = () => {
  const {
    lots,
    selectedLot,
    selectedLotId,
    filters,
    isLoading,
    updateFilters,
    selectLot,
    refreshData,
    getAvailabilityPercentage,
    searchLots
  } = useParkingData();

  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // If you know the exact lot type, replace `any` with it.
  const handleNavigate = (lot: any) => {
    try {
      openGoogleMapsNavigation(lot);
      toast({
        title: 'Opening Navigation',
        description: `Directing you to ${lot?.name ?? 'the selected lot'} via Google Maps`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Navigation Error',
        description: 'Could not open Google Maps. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  return (
    <div className="min-h-screen bg-parking-bg">
      <ParkingHeader
        onRefresh={refreshData}
        isLoading={isLoading}
        onFindNearby={(nearbyLots) => {
          if (nearbyLots.length > 0) {
            selectLot(nearbyLots[0].id);
            setActiveTab('overview');
          }
        }}
        allLots={lots}
      />

      <main className="container mx-auto px-4 py-6 pb-24">
        <ParkingControls
          filters={filters}
          onFiltersChange={updateFilters}
          onSearch={() => {}} // Search handled in SearchResults
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="overview">Parking Overview</TabsTrigger>
            <TabsTrigger value="search">Search Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map Section */}
              <div className="lg:col-span-2 space-y-6">
                {selectedLot ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => selectLot('')}
                        className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center gap-2"
                      >
                        ← Back to Overview
                      </button>
                    </div>
                    <ParkingLotDetailMap lot={selectedLot} />
                  </div>
                ) : (
                  <ParkingMap
                    lots={lots}
                    selectedLotId={selectedLotId}
                    onLotSelect={selectLot}
                  />
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <ParkingDetail
                  lot={selectedLot}
                  availabilityPercentage={getAvailabilityPercentage(selectedLot ?? undefined)}
                  onNavigate={handleNavigate}
                />

                <ParkingList
                  lots={lots}
                  selectedLotId={selectedLotId}
                  onLotSelect={selectLot}
                  getAvailabilityPercentage={getAvailabilityPercentage}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-0">
            <SearchResults
              onSearch={searchLots}
              onLotSelect={(lotId) => {
                selectLot(lotId);
                setActiveTab('overview');
              }}
              onNavigate={handleNavigate}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass-effect border-t z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>Live parking data • Colorblind-safe (✓/✗ + green/red)</div>
            <div>© Ottawa Live Parking</div>
          </div>
        </div>
      </footer>

      {/* AI Chat – assumes internal styling positions it (e.g., fixed bottom-right) */}
      <AIChat />
    </div>
  );
};

export default Index;
