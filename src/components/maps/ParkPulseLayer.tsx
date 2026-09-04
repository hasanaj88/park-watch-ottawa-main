// src/components/maps/ParkPulseLayer.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature, Geometry } from "geojson";

import { useOttawaNeighbourhoods } from "@/hooks/useOttawaNeighbourhoods";
import type { OttawaNeighbourhoodProperties } from "@/services/ottawaNeighbourhoods";

import {
  calculateParkPulseScores,
  type ParkPulseZoneScore,
} from "@/services/parkPulseEngine";

import type { ParkingLot } from "@/types/parking";
import type { Ottawa15MinParkingSegment } from "@/services/ottawa15MinParking";
import type { OttawaPaidStreetParkingSegment } from "@/services/ottawaPaidStreetParking";
import type { OttawaTrafficEventFeature } from "@/services/ottawaTrafficEvents";

/*
 * ParkPulse Engine V1
 * -------------------
 * Uses real City of Ottawa neighbourhood polygons.
 *
 * Scores are now produced by parkPulseEngine.ts.
 *
 * IMPORTANT:
 * - "live" / "estimated" / "limited" describe confidence.
 * - Paid street and 15-minute parking are contextual data only.
 * - We do not claim those streets have live vacancy.
 */

type ParkPulseFeature = Feature<
  Geometry,
  OttawaNeighbourhoodProperties
>;

type Props = {
  lots?: ParkingLot[];
  paidStreetSegments?: OttawaPaidStreetParkingSegment[];
  fifteenMinSegments?: Ottawa15MinParkingSegment[];
  trafficEvents?: OttawaTrafficEventFeature[];
  lastUpdated?: Date | null;
  trafficEventsLastUpdated?: Date | null;
};

type ParkPulseTrend =
  | "rising"
  | "stable"
  | "cooling"
  | "new";

type ParkPulseSurgeState = {
  delta: number;
  activeUntil: number;
};

const SURGE_THRESHOLD = 15;
const SURGE_DURATION_MS = 4200;

const CENTRAL_NEIGHBOURHOOD_PATTERNS = [
  // West / west-central
  "westboro",
  "hampton park",
  "wellington village",
  "hintonburg",
  "mechanicsville",

  // Central core
  "lebreton",
  "chinatown",
  "centretown",
  "downtown",
  "golden triangle",

  // North / east-central
  "byward",
  "lowertown",
  "lower town",
  "sandy hill",
  "vanier",

  // South-central
  "glebe",
  "old ottawa east",
  "old ottawa south",
  "dow's lake",
  "dows lake",
];

function normalizeName(name?: string) {
  return (name ?? "").trim().toLowerCase();
}

function getPulseColor(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 65) return "#f97316";
  if (score >= 45) return "#eab308";
  if (score >= 25) return "#84cc16";
  return "#16a34a";
}

function getFillOpacity(score: number): number {
  if (score >= 80) return 0.76;
  if (score >= 65) return 0.68;
  if (score >= 45) return 0.60;
  if (score >= 25) return 0.48;
  return 0.34;
}

function isCentralNeighbourhood(
  feature: ParkPulseFeature
): boolean {
  const name = normalizeName(
    feature.properties?.NAME
  );

  return CENTRAL_NEIGHBOURHOOD_PATTERNS.some(
    (pattern) => name.includes(pattern)
  );
}

function getConfidenceLabel(
  score: ParkPulseZoneScore
): string {
  if (score.confidence === "live") {
    return "Live-informed";
  }

  if (score.confidence === "estimated") {
    return "Live-informed estimate";
  }

  return "Modelled estimate";
}

function getConfidenceDetail(
  score: ParkPulseZoneScore
): string {
  if (score.liveLotsUsed >= 2) {
    return `${score.liveLotsUsed} nearby live City lots`;
  }

  if (score.liveLotsUsed === 1) {
    return "1 nearby live City lot";
  }

  return "No nearby live City lot";
}

function getTrend(
  previousScore: number | undefined,
  currentScore: number
): ParkPulseTrend {
  if (previousScore === undefined) {
    return "new";
  }

  const delta =
    currentScore - previousScore;

  if (delta >= 5) {
    return "rising";
  }

  if (delta <= -5) {
    return "cooling";
  }

  return "stable";
}

function getTrendLabel(
  trend: ParkPulseTrend
): string {
  if (trend === "rising") {
    return "↑ Rising";
  }

  if (trend === "cooling") {
    return "↓ Cooling";
  }

  if (trend === "stable") {
    return "→ Stable";
  }

  return "• New";
}

export default function ParkPulseLayer({
  lots = [],
  paidStreetSegments = [],
  fifteenMinSegments = [],
  trafficEvents = [],
  lastUpdated = null,
  trafficEventsLastUpdated = null,
}: Props) {
  const {
    data,
    loading,
    error,
  } = useOttawaNeighbourhoods();

  const previousScoresRef =
    useRef<Map<string, number>>(
      new Map()
    );

  const [
    trendMap,
    setTrendMap,
  ] = useState<
    Map<string, ParkPulseTrend>
  >(new Map());

  const surgeTimeoutsRef =
    useRef<Map<string, number>>(
      new Map()
    );

  const [
    surgeMap,
    setSurgeMap,
  ] = useState<
    Map<string, ParkPulseSurgeState>
  >(new Map());

  const centralFeatures = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.features.filter((feature) =>
      isCentralNeighbourhood(
        feature as ParkPulseFeature
      )
    );
  }, [data]);

  const centralCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: centralFeatures,
    }),
    [centralFeatures]
  );

  const scoreMap = useMemo(() => {
    if (!centralFeatures.length) {
      return new Map<
        string,
        ParkPulseZoneScore
      >();
    }

    const scores =
      calculateParkPulseScores({
        neighbourhoods:
          centralCollection as any,
        lots,
        paidStreetSegments,
        fifteenMinSegments,
        trafficEvents,
      });

    return new Map(
      scores.map((score) => [
        normalizeName(
          score.neighbourhoodName
        ),
        score,
      ])
    );
  }, [
    centralCollection,
    centralFeatures.length,
    lots,
    paidStreetSegments,
    fifteenMinSegments,
    trafficEvents,
  ]);

  useEffect(() => {
    if (!scoreMap.size) {
      return;
    }

    const nextTrendMap =
      new Map<
        string,
        ParkPulseTrend
      >();

    const nextPreviousScores =
      new Map<string, number>();

    const detectedSurges:
      Array<{
        key: string;
        delta: number;
      }> = [];

    for (const [
      key,
      score,
    ] of scoreMap.entries()) {
      const previousScore =
        previousScoresRef.current.get(
          key
        );

      nextTrendMap.set(
        key,
        getTrend(
          previousScore,
          score.score
        )
      );

      if (
        previousScore !== undefined
      ) {
        const delta =
          score.score -
          previousScore;

        if (
          Math.abs(delta) >=
          SURGE_THRESHOLD
        ) {
          detectedSurges.push({
            key,
            delta,
          });
        }
      }

      nextPreviousScores.set(
        key,
        score.score
      );
    }

    setTrendMap(nextTrendMap);

    previousScoresRef.current =
      nextPreviousScores;

    if (!detectedSurges.length) {
      return;
    }

    const now = Date.now();

    setSurgeMap((current) => {
      const next =
        new Map(current);

      for (
        const surge of
        detectedSurges
      ) {
        next.set(
          surge.key,
          {
            delta: surge.delta,
            activeUntil:
              now +
              SURGE_DURATION_MS,
          }
        );
      }

      return next;
    });

    for (
      const surge of
      detectedSurges
    ) {
      const existingTimeout =
        surgeTimeoutsRef.current.get(
          surge.key
        );

      if (existingTimeout) {
        window.clearTimeout(
          existingTimeout
        );
      }

      const timeoutId =
        window.setTimeout(() => {
          setSurgeMap(
            (current) => {
              const next =
                new Map(current);

              next.delete(
                surge.key
              );

              return next;
            }
          );

          surgeTimeoutsRef.current.delete(
            surge.key
          );
        }, SURGE_DURATION_MS);

      surgeTimeoutsRef.current.set(
        surge.key,
        timeoutId
      );
    }
  }, [
    scoreMap,
    lastUpdated,
    trafficEventsLastUpdated,
  ]);

  useEffect(() => {
    return () => {
      for (
        const timeoutId of
        surgeTimeoutsRef.current.values()
      ) {
        window.clearTimeout(
          timeoutId
        );
      }

      surgeTimeoutsRef.current.clear();
    };
  }, []);

  if (loading) {
    return null;
  }

  if (error) {
    console.error(
      "ParkPulse neighbourhood error:",
      error
    );
    return null;
  }

  if (!data) {
    return null;
  }

  const getScoreForFeature = (
    feature?: ParkPulseFeature
  ): ParkPulseZoneScore | null => {
    const name = normalizeName(
      feature?.properties?.NAME
    );

    return scoreMap.get(name) ?? null;
  };

  const style = (
    feature?: ParkPulseFeature
  ): PathOptions => {
    const pulse =
      getScoreForFeature(feature);

    const score =
      pulse?.score ?? 0;

    const key = normalizeName(
      feature?.properties?.NAME
    );

    const surge =
      surgeMap.get(key);

    const surgeActive =
      Boolean(
        surge &&
          surge.activeUntil >
            Date.now()
      );

    return {
      color: surgeActive
        ? "rgba(255,255,255,0.72)"
        : "rgba(255,255,255,0.10)",
      weight:
        surgeActive ? 3.2 : 0.8,
      opacity:
        surgeActive ? 0.88 : 0.22,
      fillColor:
        getPulseColor(score),
      fillOpacity: surgeActive
        ? Math.min(
            0.88,
            getFillOpacity(score) +
              0.12
          )
        : getFillOpacity(score),
      className: surgeActive
        ? "parkpulse-surge"
        : "",
    };
  };

  const updatedText =
    lastUpdated &&
    !Number.isNaN(
      lastUpdated.getTime()
    )
      ? lastUpdated.toLocaleTimeString(
          [],
          {
            hour: "numeric",
            minute: "2-digit",
          }
        )
      : null;

  const onEachFeature = (
    feature: ParkPulseFeature,
    layer: Layer
  ) => {
    const name =
      feature.properties?.NAME ||
      "Ottawa neighbourhood";

    const pulse =
      getScoreForFeature(feature);

    if (!pulse) {
      return;
    }

    const trend =
      trendMap.get(
        normalizeName(name)
      ) ?? "new";

    const trendLabel =
      getTrendLabel(trend);

    const surge =
      surgeMap.get(
        normalizeName(name)
      );

    const surgeActive =
      Boolean(
        surge &&
          surge.activeUntil >
            Date.now()
      );

    const surgeLabel =
      surgeActive && surge
        ? surge.delta > 0
          ? `⚡ Pressure surge +${surge.delta}`
          : `⚡ Pressure drop ${surge.delta}`
        : null;

    const confidenceLabel =
      getConfidenceLabel(pulse);

    const confidenceDetail =
      getConfidenceDetail(pulse);

    const livePressureLine =
      pulse.livePressure !== null
        ? `
          <div style="
            display:flex;
            justify-content:space-between;
            gap:12px;
            margin-top:5px;
            font-size:10px;
            color:#64748b;
          ">
            <span>Nearby live pressure</span>
            <strong>${pulse.livePressure}</strong>
          </div>
        `
        : "";

    layer.bindPopup(`
      <div style="
        min-width: 205px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <div style="
          font-size:15px;
          font-weight:800;
          margin-bottom:8px;
        ">
          ${name}
        </div>

        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:5px;
        ">
          <span style="
            font-size:12px;
            color:#64748b;
          ">
            ParkPulse™
          </span>

          <strong style="
            font-size:16px;
          ">
            ${pulse.score}
          </strong>
        </div>

        <div style="
          font-size:12px;
          font-weight:700;
          margin-bottom:8px;
        ">
          ${pulse.level} pressure
          <span style="
            margin-left:6px;
            color:#64748b;
            font-weight:700;
          ">
            ${trendLabel}
          </span>
        </div>

        ${
          surgeLabel
            ? `
              <div style="
                margin-top:-2px;
                margin-bottom:8px;
                font-size:11px;
                font-weight:800;
                color:#b45309;
              ">
                ${surgeLabel}
              </div>
            `
            : ""
        }

        <div style="
          border-top:1px solid #e2e8f0;
          padding-top:7px;
          font-size:10px;
          line-height:1.45;
          color:#64748b;
        ">
          <div style="
            display:flex;
            justify-content:space-between;
            gap:12px;
          ">
            <span>Confidence</span>
            <strong>${confidenceLabel}</strong>
          </div>

          <div style="
            margin-top:4px;
            color:#94a3b8;
          ">
            ${confidenceDetail}
          </div>

          ${livePressureLine}

          <div style="
            display:flex;
            justify-content:space-between;
            gap:12px;
            margin-top:5px;
          ">
            <span>Time model</span>
            <strong>${pulse.timePressure}</strong>
          </div>

          ${
            pulse.trafficPressure !== null
              ? `
                <div style="
                  display:flex;
                  justify-content:space-between;
                  gap:12px;
                  margin-top:5px;
                ">
                  <span>Traffic pressure</span>
                  <strong>${pulse.trafficPressure}</strong>
                </div>

                <div style="
                  display:flex;
                  justify-content:space-between;
                  gap:12px;
                  margin-top:5px;
                ">
                  <span>Nearby traffic events</span>
                  <strong>${pulse.nearbyTrafficEvents}</strong>
                </div>

                ${
                  pulse.highPriorityTrafficEvents > 0
                    ? `
                      <div style="
                        display:flex;
                        justify-content:space-between;
                        gap:12px;
                        margin-top:5px;
                      ">
                        <span>High priority events</span>
                        <strong>${pulse.highPriorityTrafficEvents}</strong>
                      </div>
                    `
                    : ""
                }
              `
              : ""
          }

          ${
            updatedText
              ? `
                <div style="
                  display:flex;
                  justify-content:space-between;
                  gap:12px;
                  margin-top:5px;
                ">
                  <span>Updated</span>
                  <strong>${updatedText}</strong>
                </div>
              `
              : ""
          }

          ${
            trafficEventsLastUpdated
              ? `
                <div style="
                  display:flex;
                  justify-content:space-between;
                  gap:12px;
                  margin-top:5px;
                  color:#64748b;
                ">
                  <span>Traffic feed</span>
                  <strong>${trafficEventsLastUpdated.toLocaleTimeString(
                    [],
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}</strong>
                </div>
              `
              : ""
          }

          <div style="
            margin-top:7px;
            padding-top:6px;
            border-top:1px solid #f1f5f9;
            color:#94a3b8;
          ">
            ParkPulse model · live-informed where City availability exists
          </div>
        </div>
      </div>
    `);
  };

  const renderSignature =
    Array.from(
      scoreMap.entries()
    )
      .map(([key, value]) => {
        const trend =
          trendMap.get(key) ??
          "new";

        const surge =
          surgeMap.get(key);

        const surgeFlag =
          surge &&
          surge.activeUntil >
            Date.now()
            ? `surge-${surge.delta}`
            : "quiet";

        return `${key}:${value.score}:${trend}:${surgeFlag}`;
      })
      .join("|");

  return (
    <>
      <style>
        {`
          @keyframes parkpulse-surge {
            0% {
              filter: brightness(1);
            }
            35% {
              filter: brightness(1.5);
            }
            70% {
              filter: brightness(1.15);
            }
            100% {
              filter: brightness(1);
            }
          }

          .parkpulse-surge {
            animation:
              parkpulse-surge
              1.05s ease-in-out
              3;
          }
        `}
      </style>

      <GeoJSON
      key={`parkpulse-engine-${renderSignature}`}
      data={centralCollection as any}
      style={style}
      onEachFeature={onEachFeature}
      />
    </>
  );
}
