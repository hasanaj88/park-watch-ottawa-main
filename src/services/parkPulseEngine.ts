// src/services/parkPulseEngine.ts

import type { ParkingLot } from "@/types/parking";
import type { Ottawa15MinParkingSegment } from "@/services/ottawa15MinParking";
import type { OttawaPaidStreetParkingSegment } from "@/services/ottawaPaidStreetParking";
import type {
  OttawaNeighbourhoodFeature,
  OttawaNeighbourhoodFeatureCollection,
} from "@/services/ottawaNeighbourhoods";
import type { OttawaTrafficEventFeature } from "@/services/ottawaTrafficEvents";

export type ParkPulseConfidence =
  | "live"
  | "estimated"
  | "limited";

export type ParkPulseZoneScore = {
  neighbourhoodName: string;
  score: number;
  level:
    | "Easy"
    | "Comfortable"
    | "Moderate"
    | "High"
    | "Critical";
  confidence: ParkPulseConfidence;

  liveLotsUsed: number;
  livePressure: number | null;
  timePressure: number;

  trafficPressure: number | null;
  nearbyTrafficEvents: number;
  highPriorityTrafficEvents: number;

  nearbyPaidStreetSegments: number;
  nearbyFifteenMinSegments: number;

  updatedAt: string;
};

type LatLng = {
  lat: number;
  lng: number;
};

const clamp = (
  value: number,
  min: number,
  max: number
) => Math.min(max, Math.max(min, value));

function haversineKm(
  a: LatLng,
  b: LatLng
): number {
  const earthRadiusKm = 6371;

  const dLat =
    ((b.lat - a.lat) * Math.PI) / 180;
  const dLng =
    ((b.lng - a.lng) * Math.PI) / 180;

  const lat1 =
    (a.lat * Math.PI) / 180;
  const lat2 =
    (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return (
    2 *
    earthRadiusKm *
    Math.asin(Math.sqrt(x))
  );
}

function getLevel(
  score: number
): ParkPulseZoneScore["level"] {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High";
  if (score >= 45) return "Moderate";
  if (score >= 25) return "Comfortable";
  return "Easy";
}

/*
 * Temporal model only.
 *
 * This is NOT live occupancy.
 * It is a transparent heuristic representing
 * typical parking-demand pressure by hour/day.
 *
 * It can later be replaced with calibrated
 * historical Ottawa demand data.
 */
function getTimePressure(
  date: Date
): number {
  const hour = date.getHours();
  const day = date.getDay();

  const weekend =
    day === 0 || day === 6;

  if (weekend) {
    if (hour >= 11 && hour < 19) {
      return 48;
    }

    if (hour >= 19 && hour < 23) {
      return 42;
    }

    return 24;
  }

  if (hour >= 7 && hour < 10) {
    return 56;
  }

  if (hour >= 10 && hour < 16) {
    return 50;
  }

  if (hour >= 16 && hour < 19) {
    return 62;
  }

  if (hour >= 19 && hour < 23) {
    return 38;
  }

  return 20;
}

function flattenCoordinates(
  value: unknown,
  output: LatLng[]
) {
  if (!Array.isArray(value)) {
    return;
  }

  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    output.push({
      lng: value[0],
      lat: value[1],
    });

    return;
  }

  for (const child of value) {
    flattenCoordinates(
      child,
      output
    );
  }
}

function getFeatureCenter(
  feature: OttawaNeighbourhoodFeature
): LatLng | null {
  if (!feature.geometry) {
    return null;
  }

  const points: LatLng[] = [];

  flattenCoordinates(
    feature.geometry.coordinates,
    points
  );

  if (!points.length) {
    return null;
  }

  let lat = 0;
  let lng = 0;

  for (const point of points) {
    lat += point.lat;
    lng += point.lng;
  }

  return {
    lat: lat / points.length,
    lng: lng / points.length,
  };
}

function getLotPosition(
  lot: ParkingLot
): LatLng | null {
  const lotAny = lot as any;

  const lat = Number(
    lotAny.coordinates?.lat
  );

  const lng = Number(
    lotAny.coordinates?.lng
  );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return { lat, lng };
}

function getLiveLotPressure(
  lot: ParkingLot
): number | null {
  const lotAny = lot as any;

  if (lotAny.isLive !== true) {
    return null;
  }

  const capacity = Number(
    lotAny.capacity ??
      lotAny.total ??
      lotAny.map_capacity
  );

  const free =
    typeof lotAny.free === "number"
      ? lotAny.free
      : typeof lotAny.freeSpaces ===
        "number"
      ? lotAny.freeSpaces
      : null;

  if (
    !Number.isFinite(capacity) ||
    capacity <= 0 ||
    free === null
  ) {
    return null;
  }

  const safeFree = clamp(
    free,
    0,
    capacity
  );

  const occupancy =
    (capacity - safeFree) /
    capacity;

  return clamp(
    occupancy * 100,
    0,
    100
  );
}

function getSegmentMidpoint(
  coordinates: [number, number][]
): LatLng | null {
  if (!coordinates.length) {
    return null;
  }

  const first = coordinates[0];
  const last =
    coordinates[
      coordinates.length - 1
    ];

  if (!first || !last) {
    return null;
  }

  const lng =
    (Number(first[0]) +
      Number(last[0])) /
    2;

  const lat =
    (Number(first[1]) +
      Number(last[1])) /
    2;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return { lat, lng };
}

function countNearbyPaidStreet(
  center: LatLng,
  segments: OttawaPaidStreetParkingSegment[],
  radiusKm: number
): number {
  let count = 0;

  for (const segment of segments) {
    const midpoint =
      getSegmentMidpoint(
        segment.coordinates
      );

    if (
      midpoint &&
      haversineKm(
        center,
        midpoint
      ) <= radiusKm
    ) {
      count += 1;
    }
  }

  return count;
}

function countNearbyFifteenMin(
  center: LatLng,
  segments: Ottawa15MinParkingSegment[],
  radiusKm: number
): number {
  let count = 0;

  for (const segment of segments) {
    const midpoint =
      getSegmentMidpoint(
        segment.coordinates
      );

    if (
      midpoint &&
      haversineKm(
        center,
        midpoint
      ) <= radiusKm
    ) {
      count += 1;
    }
  }

  return count;
}

function calculateNearbyLivePressure(
  center: LatLng,
  lots: ParkingLot[],
  radiusKm: number
): {
  pressure: number | null;
  liveLotsUsed: number;
} {
  let weightedPressure = 0;
  let totalWeight = 0;
  let liveLotsUsed = 0;

  for (const lot of lots) {
    const position =
      getLotPosition(lot);

    const pressure =
      getLiveLotPressure(lot);

    if (
      !position ||
      pressure === null
    ) {
      continue;
    }

    const distanceKm =
      haversineKm(
        center,
        position
      );

    if (distanceKm > radiusKm) {
      continue;
    }

    /*
     * Nearby live lots have more influence.
     * Minimum distance prevents extreme weight.
     */
    const safeDistance =
      Math.max(0.35, distanceKm);

    const weight =
      1 / safeDistance;

    weightedPressure +=
      pressure * weight;

    totalWeight += weight;
    liveLotsUsed += 1;
  }

  if (
    totalWeight <= 0 ||
    liveLotsUsed === 0
  ) {
    return {
      pressure: null,
      liveLotsUsed: 0,
    };
  }

  return {
    pressure: clamp(
      weightedPressure /
        totalWeight,
      0,
      100
    ),
    liveLotsUsed,
  };
}


function getTrafficEventPoints(
  event: OttawaTrafficEventFeature
): LatLng[] {
  const geometry = event.geometry;

  if (!geometry) {
    return [];
  }

  const points: LatLng[] = [];
  flattenCoordinates(
    geometry.coordinates,
    points
  );

  return points;
}

function getTrafficEventDistanceKm(
  center: LatLng,
  event: OttawaTrafficEventFeature
): number | null {
  const points =
    getTrafficEventPoints(event);

  if (!points.length) {
    return null;
  }

  let nearest = Infinity;

  for (const point of points) {
    const distance =
      haversineKm(center, point);

    if (distance < nearest) {
      nearest = distance;
    }
  }

  return Number.isFinite(nearest)
    ? nearest
    : null;
}

function getTrafficEventBasePressure(
  event: OttawaTrafficEventFeature
): number {
  const priority =
    String(
      event.properties?.priority ??
        ""
    )
      .trim()
      .toUpperCase();

  const eventType =
    String(
      event.properties?.EventType ??
        event.properties?.eventType ??
        ""
    )
      .trim()
      .toUpperCase();

  let pressure =
    priority === "HIGH"
      ? 90
      : priority === "MEDIUM"
      ? 65
      : priority === "LOW"
      ? 40
      : 50;

  // Incidents tend to be less predictable
  // than planned construction/events.
  if (eventType === "INCIDENT") {
    pressure += 8;
  } else if (
    eventType === "SPECIAL_EVENT"
  ) {
    pressure += 4;
  }

  return clamp(pressure, 0, 100);
}

function calculateNearbyTrafficPressure(
  center: LatLng,
  events: OttawaTrafficEventFeature[],
  radiusKm: number
): {
  pressure: number | null;
  nearbyTrafficEvents: number;
  highPriorityTrafficEvents: number;
} {
  let weightedPressure = 0;
  let totalWeight = 0;
  let nearbyTrafficEvents = 0;
  let highPriorityTrafficEvents = 0;

  for (const event of events) {
    const distanceKm =
      getTrafficEventDistanceKm(
        center,
        event
      );

    if (
      distanceKm === null ||
      distanceKm > radiusKm
    ) {
      continue;
    }

    const priority =
      String(
        event.properties?.priority ??
          ""
      )
        .trim()
        .toUpperCase();

    if (priority === "HIGH") {
      highPriorityTrafficEvents += 1;
    }

    const basePressure =
      getTrafficEventBasePressure(
        event
      );

    // Closer events matter more, but cap the
    // minimum distance to avoid extreme weights.
    const safeDistance =
      Math.max(0.35, distanceKm);

    const weight =
      1 / safeDistance;

    weightedPressure +=
      basePressure * weight;

    totalWeight += weight;
    nearbyTrafficEvents += 1;
  }

  if (
    nearbyTrafficEvents === 0 ||
    totalWeight <= 0
  ) {
    return {
      pressure: null,
      nearbyTrafficEvents: 0,
      highPriorityTrafficEvents: 0,
    };
  }

  return {
    pressure: clamp(
      weightedPressure /
        totalWeight,
      0,
      100
    ),
    nearbyTrafficEvents,
    highPriorityTrafficEvents,
  };
}

export function calculateParkPulseScores({
  neighbourhoods,
  lots,
  paidStreetSegments,
  fifteenMinSegments,
  trafficEvents = [],
  now = new Date(),
  liveInfluenceRadiusKm = 2.5,
  trafficInfluenceRadiusKm = 2.0,
  contextRadiusKm = 1.25,
}: {
  neighbourhoods: OttawaNeighbourhoodFeatureCollection;
  lots: ParkingLot[];
  paidStreetSegments: OttawaPaidStreetParkingSegment[];
  fifteenMinSegments: Ottawa15MinParkingSegment[];
  trafficEvents?: OttawaTrafficEventFeature[];
  now?: Date;
  liveInfluenceRadiusKm?: number;
  trafficInfluenceRadiusKm?: number;
  contextRadiusKm?: number;
}): ParkPulseZoneScore[] {
  const timePressure =
    getTimePressure(now);

  const results: ParkPulseZoneScore[] =
    [];

  for (
    const feature of
    neighbourhoods.features
  ) {
    const center =
      getFeatureCenter(feature);

    if (!center) {
      continue;
    }

    const neighbourhoodName =
      feature.properties?.NAME?.trim() ||
      "Ottawa neighbourhood";

    const live =
      calculateNearbyLivePressure(
        center,
        lots,
        liveInfluenceRadiusKm
      );

    const traffic =
      calculateNearbyTrafficPressure(
        center,
        trafficEvents,
        trafficInfluenceRadiusKm
      );

    /*
     * V2 PARKPULSE FORMULA
     *
     * When live parking + nearby traffic events exist:
     *   60% nearby live lot occupancy
     *   20% temporal demand model
     *   20% nearby traffic/event pressure
     *
     * If a signal is unavailable, its weight is
     * removed and the remaining weights are
     * renormalized. Missing traffic events therefore
     * do NOT artificially lower a neighbourhood.
     *
     * Traffic events are contextual pressure signals,
     * NOT live traffic speed/flow or parking vacancy.
     */
    let weightedScore = 0;
    let totalScoreWeight = 0;

    if (live.pressure !== null) {
      weightedScore +=
        live.pressure * 0.6;
      totalScoreWeight += 0.6;
    }

    weightedScore +=
      timePressure * 0.2;
    totalScoreWeight += 0.2;

    if (traffic.pressure !== null) {
      weightedScore +=
        traffic.pressure * 0.2;
      totalScoreWeight += 0.2;
    }

    const score = Math.round(
      weightedScore /
        totalScoreWeight
    );

    const nearbyPaidStreetSegments =
      countNearbyPaidStreet(
        center,
        paidStreetSegments,
        contextRadiusKm
      );

    const nearbyFifteenMinSegments =
      countNearbyFifteenMin(
        center,
        fifteenMinSegments,
        contextRadiusKm
      );

    const confidence:
      ParkPulseConfidence =
      live.liveLotsUsed >= 2
        ? "live"
        : live.liveLotsUsed === 1
        ? "estimated"
        : "limited";

    results.push({
      neighbourhoodName,
      score: clamp(
        score,
        0,
        100
      ),
      level: getLevel(score),
      confidence,

      liveLotsUsed:
        live.liveLotsUsed,

      livePressure:
        live.pressure === null
          ? null
          : Math.round(
              live.pressure
            ),

      timePressure,

      trafficPressure:
        traffic.pressure === null
          ? null
          : Math.round(
              traffic.pressure
            ),

      nearbyTrafficEvents:
        traffic.nearbyTrafficEvents,

      highPriorityTrafficEvents:
        traffic.highPriorityTrafficEvents,

      nearbyPaidStreetSegments,
      nearbyFifteenMinSegments,

      updatedAt:
        now.toISOString(),
    });
  }

  return results;
}
