import { Button } from "@/components/ui/button";
import { Moon, Sun, RefreshCw, MapPin } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ParkingLot } from "@/types/parking";
import { calculateDistance } from "@/utils/distance";

interface ParkingHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onFindNearby: (nearbyLots: ParkingLot[]) => void;
  allLots: ParkingLot[];
}

export const ParkingHeader = ({
  onRefresh,
  isLoading,
  onFindNearby,
  allLots,
}: ParkingHeaderProps) => {
  const { theme, setTheme } = useTheme();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

  const handleFindNearby = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const lotsWithDistance = allLots
          .map((lot) => ({
            ...lot,
            distanceKm: calculateDistance(
              latitude,
              longitude,
              lot.coordinates.lat,
              lot.coordinates.lng
            ),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm);

        const nearbyLots = lotsWithDistance.slice(0, 5);

        setIsGettingLocation(false);
        onFindNearby(nearbyLots);

        toast({
          title: "Found Nearby Parking",
          description: `Found ${nearbyLots.length} parking locations near you. Closest is ${nearbyLots[0]?.name} (${nearbyLots[0]?.distanceKm}km away)`,
          duration: 4000,
        });
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "Could not get your location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please enable location services";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
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
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-parking-ring to-blue-500 flex items-center justify-center">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-parking-available to-parking-ring" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-parking-available text-white text-xs px-1.5 py-0.5 rounded-md font-semibold">
                LIVE
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">Ottawa Live Parking</h1>
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
                  isGettingLocation ? "animate-pulse" : ""
                }`}
              />
              <span className="hidden sm:inline">
                {isGettingLocation ? "Getting Location..." : "Parking Near You"}
              </span>
              <span className="sm:hidden">
                {isGettingLocation ? "Locating..." : "Nearby"}
              </span>
            </Button>

            <div className="glass-effect rounded-xl px-3 py-2 hidden md:block">
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="status-dot-available w-2 h-2 rounded-full" />
                  <span>Available (✓)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="status-dot-busy w-2 h-2 rounded-full" />
                  <span>Busy (✗)</span>
                </div>
              </div>
            </div>

            {/* Refresh + Theme grouped together */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="gap-2"
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Theme</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
