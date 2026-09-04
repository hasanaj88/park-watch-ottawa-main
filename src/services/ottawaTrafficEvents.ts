export type OttawaTrafficEventType =
  | "CONSTRUCTION"
  | "SPECIAL_EVENT"
  | "INCIDENT"
  | string;

export type OttawaTrafficEventStatus =
  | "ACTVE"
  | "SCHEDULED"
  | "ARCHIVED"
  | string;

export type OttawaTrafficEventPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "UNKNOWN"
  | string;

export type OttawaTrafficEventGeometry =
  | {
      type: "Point";
      coordinates: [number, number];
    }
  | {
      type: "MultiLineString";
      coordinates: number[][][];
    }
  | {
      type: string;
      coordinates: unknown;
    };

export type OttawaTrafficEventProperties = {
  Id?: number;
  id?: number;

  Created?: string;
  created?: string;

  Updated?: string;
  updated?: string;

  EventType?: OttawaTrafficEventType;
  eventType?: OttawaTrafficEventType;

  eventSubType?: string;

  generation_source?: string;

  status?: OttawaTrafficEventStatus;

  headline?: string;
  message?: string;
  cause?: string;

  mainStreet?: string;
  crossStreet1?: string;
  crossStreet2?: string;

  closureType?: string;
  closureFlow?: string;
  lanes?: string;

  priority?: OttawaTrafficEventPriority;

  area?: string;

  impacted_groups?: number;

  schedule?: Array<{
    startDateTime?: string;
    endDateTime?: string;
    days?: string;
    hours?: string;
  }>;

  [key: string]: unknown;
};

export type OttawaTrafficEventFeature = {
  type: "Feature";
  id?: string | number;
  geometry: OttawaTrafficEventGeometry | null;
  properties: OttawaTrafficEventProperties;
};

export type OttawaTrafficEventFeatureCollection = {
  type: "FeatureCollection";
  features: OttawaTrafficEventFeature[];
};

const OTTAWA_TRAFFIC_EVENTS_URL =
  "https://traffic.ottawa.ca/map/service/events?accept-language=en&version=v2&format=geojson";

const FETCH_TIMEOUT_MS = 12_000;

const isFeatureCollection = (
  value: unknown
): value is OttawaTrafficEventFeatureCollection => {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as Partial<OttawaTrafficEventFeatureCollection>;

  return (
    candidate.type === "FeatureCollection" &&
    Array.isArray(candidate.features)
  );
};

export const eventImpactsCars = (
  event: OttawaTrafficEventFeature
): boolean => {
  const impactedGroups =
    event.properties.impacted_groups;

  if (
    typeof impactedGroups !== "number"
  ) {
    // Some City events omit impacted_groups.
    // Do not discard them solely because the field
    // is absent.
    return true;
  }

  // City code:
  // 1 = cars
  return (impactedGroups & 1) === 1;
};

export const isActiveTrafficEvent = (
  event: OttawaTrafficEventFeature
): boolean => {
  const status =
    event.properties.status
      ?.trim()
      .toUpperCase();

  // City currently documents ACTVE
  // (without the second "I").
  return status === "ACTVE";
};

export const getTrafficEventPriority = (
  event: OttawaTrafficEventFeature
): OttawaTrafficEventPriority => {
  const priority =
    event.properties.priority;

  if (
    typeof priority !== "string" ||
    !priority.trim()
  ) {
    return "UNKNOWN";
  }

  return priority
    .trim()
    .toUpperCase();
};

export const fetchOttawaTrafficEvents =
  async (): Promise<
    OttawaTrafficEventFeatureCollection
  > => {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(() => {
        controller.abort();
      }, FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(
        OTTAWA_TRAFFIC_EVENTS_URL,
        {
          method: "GET",
          headers: {
            Accept:
              "application/geo+json, application/json",
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Ottawa traffic events request failed (${response.status})`
        );
      }

      const data: unknown =
        await response.json();

      if (!isFeatureCollection(data)) {
        throw new Error(
          "Ottawa traffic events returned an unexpected response"
        );
      }

      return {
        type: "FeatureCollection",
        features: data.features.filter(
          (feature) =>
            feature &&
            feature.type === "Feature" &&
            feature.properties &&
            typeof feature.properties ===
              "object"
        ),
      };
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new Error(
          "Ottawa traffic events request timed out"
        );
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };
