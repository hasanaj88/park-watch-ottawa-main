import { useCallback, useEffect, useState } from "react";

import {
  fetchOttawaPaidStreetParking,
  type OttawaPaidStreetParkingSegment,
} from "@/services/ottawaPaidStreetParking";

export const useOttawaPaidStreetParking = () => {
  const [segments, setSegments] = useState<
    OttawaPaidStreetParkingSegment[]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const fetchSegments =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const data =
          await fetchOttawaPaidStreetParking();

        setSegments(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load paid street parking";

        setError(message);

        // Keep the base parking map working
        // even if the City API fails.
        setSegments([]);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void fetchSegments();
  }, [fetchSegments]);

  return {
    segments,
    loading,
    error,
    refetch: fetchSegments,
  };
};