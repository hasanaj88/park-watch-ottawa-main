import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  fetchOttawaLiveParking,
  type OttawaLiveParkingLot,
} from "@/services/ottawaLiveParking";

const LIVE_REFRESH_MS = 60_000;

export const useOttawaLiveParking = () => {
  const [lots, setLots] = useState<
    OttawaLiveParkingLot[]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const fetchLots =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const data =
          await fetchOttawaLiveParking();

        setLots(data);

        // Record the time of the most recent
        // successful City of Ottawa update.
        setLastUpdated(new Date());
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load Ottawa live parking";

        setError(message);

        // Keep the last successful data.
        // We will mark it as stale in the UI
        // instead of pretending it is current.
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void fetchLots();

    const intervalId =
      window.setInterval(() => {
        void fetchLots();
      }, LIVE_REFRESH_MS);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [fetchLots]);

  return {
    lots,
    loading,
    error,
    lastUpdated,
    refetch: fetchLots,
  };
};