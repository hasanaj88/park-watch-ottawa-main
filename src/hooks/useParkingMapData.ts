import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/services/supabaseClient";

export type ParkingMapRow = {
  map_id: string;
  map_name: string;
  map_lat: number;
  map_lng: number;
  map_capacity: number | null;
  map_available: number | null;
  map_status: string | null;
  map_data_mode: "api" | "virtual" | string;
  map_updated_at: string | null;
};

export const useParkingMapData = (refreshIntervalMs: number = 60000) => {
  const [rows, setRows] = useState<ParkingMapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMapLots = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("parking_app_view")
      .select(
        "map_id,map_name,map_lat,map_lng,map_capacity,map_available,map_status,map_data_mode,map_updated_at"
      );

    if (import.meta.env.DEV) {
      console.log("✅ USING useParkingMapData (parking_app_view)");
    }

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as ParkingMapRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchMapLots();
  }, [fetchMapLots]);

  useEffect(() => {
    if (!refreshIntervalMs || refreshIntervalMs <= 0) return;
    const id = window.setInterval(() => void fetchMapLots(), refreshIntervalMs);
    return () => window.clearInterval(id);
  }, [fetchMapLots, refreshIntervalMs]);

  return { rows, loading, error, refetch: fetchMapLots };
};
