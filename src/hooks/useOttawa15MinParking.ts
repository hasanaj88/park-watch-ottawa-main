import { useCallback, useEffect, useState } from "react";
import {
  fetchOttawa15MinParking,
  type Ottawa15MinParkingSegment,
} from "@/services/ottawa15MinParking";

export const useOttawa15MinParking = () => {
  const [segments, setSegments] = useState<Ottawa15MinParkingSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchOttawa15MinParking();
      setSegments(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load 15-minute parking";

      setError(message);
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