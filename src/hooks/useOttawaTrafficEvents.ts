import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  eventImpactsCars,
  fetchOttawaTrafficEvents,
  isActiveTrafficEvent,
  type OttawaTrafficEventFeature,
  type OttawaTrafficEventFeatureCollection,
} from "@/services/ottawaTrafficEvents";

const TRAFFIC_EVENTS_REFRESH_MS =
  60_000;

export const useOttawaTrafficEvents =
  () => {
    const [
      data,
      setData,
    ] =
      useState<OttawaTrafficEventFeatureCollection | null>(
        null
      );

    const [
      loading,
      setLoading,
    ] = useState(false);

    const [
      error,
      setError,
    ] = useState<
      string | null
    >(null);

    const [
      lastUpdated,
      setLastUpdated,
    ] = useState<
      Date | null
    >(null);

    const fetchEvents =
      useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
          const nextData =
            await fetchOttawaTrafficEvents();

          setData(nextData);
          setLastUpdated(new Date());
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load Ottawa traffic events";

          setError(message);

          // Keep the last successful data.
          // ParkPulse can continue using it
          // rather than dropping to zero events.
        } finally {
          setLoading(false);
        }
      }, []);

    useEffect(() => {
      void fetchEvents();

      const intervalId =
        window.setInterval(() => {
          void fetchEvents();
        }, TRAFFIC_EVENTS_REFRESH_MS);

      return () => {
        window.clearInterval(
          intervalId
        );
      };
    }, [fetchEvents]);

    const activeEvents =
      useMemo<
        OttawaTrafficEventFeature[]
      >(() => {
        if (!data) {
          return [];
        }

        return data.features.filter(
          (event) =>
            isActiveTrafficEvent(
              event
            )
        );
      }, [data]);

    const activeCarEvents =
      useMemo<
        OttawaTrafficEventFeature[]
      >(() => {
        return activeEvents.filter(
          (event) =>
            eventImpactsCars(event)
        );
      }, [activeEvents]);

    return {
      data,
      activeEvents,
      activeCarEvents,
      loading,
      error,
      lastUpdated,
      refetch: fetchEvents,
    };
  };
