// src/services/parkSenseEngine.ts

import type { NearbyParkingResult } from "@/components/parking/ParkingHeader";

export type ParkSenseIntent = "best" | "fastest" | "cheapest";

export type ParkSenseContext = {
  /**
   * Optional planned parking duration.
   * If unknown, ParkSense keeps 15-minute parking eligible,
   * but gives it a suitability penalty for general "Best" ranking.
   */
  stayMinutes?: number | null;

  /**
   * Optional ParkPulse pressure for the destination area (0-100).
   * Lower pressure = easier parking conditions.
   * V1 is designed so this signal can be connected later without
   * changing the ranking API.
   */
  parkPulseScore?: number | null;
};

export type ParkSenseScoredResult = NearbyParkingResult & {
  parkSenseScore: number;
  intent: ParkSenseIntent;

  metrics: {
    distance: number;
    availability: number;
    price: number;
    suitability: number;
    parkPulse: number | null;
  };

  reasons: string[];
  warning?: string | null;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const roundScore = (value: number) =>
  Math.round(clamp(value));

/**
 * Extracts a numeric hourly rate from labels such as:
 * "$4/hr", "$3.50/hr", "$2.00 / hr"
 */
export const parseHourlyRate = (
  rateLabel?: string | null
): number | null => {
  if (!rateLabel) return null;

  const match = rateLabel.match(
    /\$?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*hr|per\s*hour|\/hour)/i
  );

  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const getDistanceScore = (
  distanceKm: number
): number => {
  // Sprint 4 currently searches within 2 km.
  // 0 km => 100, 2 km => 0.
  return clamp(
    100 - (distanceKm / 2) * 100
  );
};

const getAvailabilityScore = (
  item: NearbyParkingResult
): number => {
  if (
    item.isLive &&
    typeof item.freeSpaces === "number" &&
    typeof item.capacity === "number" &&
    item.capacity > 0
  ) {
    return clamp(
      (item.freeSpaces / item.capacity) * 100
    );
  }

  // V1 does NOT pretend these values are live vacancy.
  if (item.kind === "paid") return 52;
  if (item.kind === "15min") return 48;
  if (item.isCityOfficial) return 50;

  return 50;
};

const getPriceScore = (
  item: NearbyParkingResult
): number => {
  if (item.kind === "15min") {
    return 100;
  }

  const hourlyRate =
    parseHourlyRate(item.rateLabel);

  if (hourlyRate === null) {
    // Unknown price is neutral, not free.
    return 50;
  }

  // Simple V1 normalization:
  // $0/hr => 100
  // $5/hr or above => 0
  return clamp(
    100 - (hourlyRate / 5) * 100
  );
};

const getSuitability = (
  item: NearbyParkingResult,
  stayMinutes?: number | null
): {
  score: number;
  warning: string | null;
} => {
  if (item.kind !== "15min") {
    return {
      score: 90,
      warning: null,
    };
  }

  if (
    typeof stayMinutes === "number" &&
    Number.isFinite(stayMinutes)
  ) {
    if (stayMinutes <= 15) {
      return {
        score: 100,
        warning: null,
      };
    }

    return {
      score: 0,
      warning:
        "15-minute parking is not suitable for this stay duration.",
    };
  }

  return {
    score: 45,
    warning:
      "15-minute parking is only suitable for short stops.",
  };
};

const getParkPulseScore = (
  pressure?: number | null
): number | null => {
  if (
    typeof pressure !== "number" ||
    !Number.isFinite(pressure)
  ) {
    return null;
  }

  // ParkPulse is pressure (higher = harder).
  // ParkSense wants ease (higher = better).
  return clamp(100 - pressure);
};

const weightedAverage = (
  parts: Array<{
    value: number | null;
    weight: number;
  }>
): number => {
  const available = parts.filter(
    (
      part
    ): part is {
      value: number;
      weight: number;
    } => part.value !== null
  );

  const totalWeight = available.reduce(
    (sum, part) => sum + part.weight,
    0
  );

  if (totalWeight <= 0) {
    return 0;
  }

  return available.reduce(
    (sum, part) =>
      sum +
      part.value *
        (part.weight / totalWeight),
    0
  );
};

const getReasons = (
  item: NearbyParkingResult,
  intent: ParkSenseIntent,
  metrics: ParkSenseScoredResult["metrics"]
): string[] => {
  const reasons: string[] = [];

  if (item.distanceKm <= 0.2) {
    reasons.push("Very close to your destination");
  } else if (item.distanceKm <= 0.5) {
    reasons.push("Short walk from your destination");
  }

  if (
    item.isLive &&
    typeof item.freeSpaces === "number"
  ) {
    reasons.push(
      `${item.freeSpaces} live spaces currently reported`
    );
  }

  if (item.kind === "15min") {
    reasons.push("Free for short stops");
  } else {
    const hourlyRate =
      parseHourlyRate(item.rateLabel);

    if (hourlyRate !== null) {
      reasons.push(`About $${hourlyRate.toFixed(
        Number.isInteger(hourlyRate)
          ? 0
          : 2
      )}/hr`);
    }
  }

  if (
    intent === "cheapest" &&
    metrics.price >= 80
  ) {
    reasons.push("Strong value");
  }

  if (
    intent === "fastest" &&
    metrics.distance >= 80
  ) {
    reasons.push("Prioritizes minimal walking");
  }

  if (
    intent === "best" &&
    metrics.availability >= 65
  ) {
    reasons.push("Good availability signal");
  }

  return reasons.slice(0, 3);
};

const scoreOne = (
  item: NearbyParkingResult,
  intent: ParkSenseIntent,
  context: ParkSenseContext
): ParkSenseScoredResult => {
  const distance =
    getDistanceScore(item.distanceKm);

  const availability =
    getAvailabilityScore(item);

  const price =
    getPriceScore(item);

  const suitabilityResult =
    getSuitability(
      item,
      context.stayMinutes
    );

  const parkPulse =
    getParkPulseScore(
      context.parkPulseScore
    );

  let score: number;

  if (intent === "fastest") {
    score = weightedAverage([
      { value: distance, weight: 0.55 },
      {
        value: availability,
        weight: 0.25,
      },
      {
        value: suitabilityResult.score,
        weight: 0.15,
      },
      {
        value: parkPulse,
        weight: 0.05,
      },
    ]);
  } else if (intent === "cheapest") {
    score = weightedAverage([
      { value: price, weight: 0.55 },
      { value: distance, weight: 0.20 },
      {
        value: suitabilityResult.score,
        weight: 0.20,
      },
      {
        value: availability,
        weight: 0.05,
      },
    ]);
  } else {
    // Best = balanced default.
    score = weightedAverage([
      {
        value: availability,
        weight: 0.30,
      },
      { value: distance, weight: 0.30 },
      { value: price, weight: 0.15 },
      {
        value: suitabilityResult.score,
        weight: 0.15,
      },
      {
        value: parkPulse,
        weight: 0.10,
      },
    ]);
  }

  /*
   * Hard safety rule for Best/Cheapest:
   * if the user explicitly plans to stay longer than 15 minutes,
   * 15-minute parking cannot outrank legal long-stay options.
   */
  if (
    item.kind === "15min" &&
    typeof context.stayMinutes === "number" &&
    context.stayMinutes > 15
  ) {
    score = Math.min(score, 15);
  }

  const metrics = {
    distance: roundScore(distance),
    availability:
      roundScore(availability),
    price: roundScore(price),
    suitability:
      roundScore(
        suitabilityResult.score
      ),
    parkPulse:
      parkPulse === null
        ? null
        : roundScore(parkPulse),
  };

  return {
    ...item,
    parkSenseScore:
      roundScore(score),
    intent,
    metrics,
    reasons:
      getReasons(
        item,
        intent,
        metrics
      ),
    warning:
      suitabilityResult.warning,
  };
};

export const rankParkSense = (
  items: NearbyParkingResult[],
  intent: ParkSenseIntent = "best",
  context: ParkSenseContext = {}
): ParkSenseScoredResult[] => {
  return items
    .map((item) =>
      scoreOne(
        item,
        intent,
        context
      )
    )
    .sort((a, b) => {
      const scoreDiff =
        b.parkSenseScore -
        a.parkSenseScore;

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return (
        a.distanceKm -
        b.distanceKm
      );
    });
};

export const getParkSenseTopChoices = (
  items: NearbyParkingResult[],
  context: ParkSenseContext = {}
) => {
  return {
    best:
      rankParkSense(
        items,
        "best",
        context
      )[0] ?? null,

    fastest:
      rankParkSense(
        items,
        "fastest",
        context
      )[0] ?? null,

    cheapest:
      rankParkSense(
        items,
        "cheapest",
        context
      )[0] ?? null,
  };
};
