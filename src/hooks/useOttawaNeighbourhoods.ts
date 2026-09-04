// src/hooks/useOttawaNeighbourhoods.ts

import { useEffect, useState } from "react";
import {
  fetchOttawaNeighbourhoods,
  OttawaNeighbourhoodFeatureCollection,
} from "@/services/ottawaNeighbourhoods";

type UseOttawaNeighbourhoodsResult = {
  data: OttawaNeighbourhoodFeatureCollection | null;
  loading: boolean;
  error: string | null;
};

export function useOttawaNeighbourhoods(): UseOttawaNeighbourhoodsResult {
  const [data, setData] =
    useState<OttawaNeighbourhoodFeatureCollection | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNeighbourhoods() {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchOttawaNeighbourhoods();

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load Ottawa neighbourhoods"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNeighbourhoods();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    data,
    loading,
    error,
  };
}