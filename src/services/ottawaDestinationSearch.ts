// src/services/ottawaDestinationSearch.ts
//
// Sprint 4 — Destination Search V4
// Photon + OpenStreetMap
//
// No API key is required.
// Designed for destination/POI autocomplete such as:
// Rideau Centre, University of Ottawa, CHEO, Costco.
//
// The public Photon endpoint should be used reasonably:
// debounce requests, keep result count small, and cache repeated queries.

export type OttawaDestinationResult = {
  id: string;
  label: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  score: number;
  type: string | null;
};

type PhotonFeature = {
  type?: "Feature";
  geometry?: {
    type?: "Point";
    coordinates?: [number, number];
  };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

type PhotonResponse = {
  type?: "FeatureCollection";
  features?: PhotonFeature[];
};

const PHOTON_URL =
  "https://photon.komoot.io/api/";

// Ottawa bias.
const OTTAWA_LAT = 45.4215;
const OTTAWA_LNG = -75.6972;

// Broad Ottawa geographic safety envelope.
const OTTAWA_BOUNDS = {
  minLat: 44.96,
  maxLat: 45.54,
  minLng: -76.36,
  maxLng: -75.24,
};

const DEFAULT_LIMIT = 5;
const REQUEST_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

const cache =
  new Map<
    string,
    OttawaDestinationResult[]
  >();

const clean = (
  value?: string
): string =>
  (value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const normalize = (
  value?: string
): string =>
  clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bcentre\b/g, "center")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isInsideOttawaBounds = (
  lat: number,
  lng: number
): boolean =>
  lat >= OTTAWA_BOUNDS.minLat &&
  lat <= OTTAWA_BOUNDS.maxLat &&
  lng >= OTTAWA_BOUNDS.minLng &&
  lng <= OTTAWA_BOUNDS.maxLng;

const buildAddress = (
  properties: PhotonFeature["properties"]
): string => {
  if (!properties) {
    return "";
  }

  const streetAddress = [
    clean(properties.housenumber),
    clean(properties.street),
  ]
    .filter(Boolean)
    .join(" ");

  const parts = [
    streetAddress,
    clean(properties.city),
    clean(properties.state),
    clean(properties.postcode),
  ].filter(Boolean);

  const unique: string[] = [];

  for (const part of parts) {
    if (
      !unique.some(
        (existing) =>
          normalize(existing) ===
          normalize(part)
      )
    ) {
      unique.push(part);
    }
  }

  return unique.join(", ");
};

const getType = (
  properties: PhotonFeature["properties"]
): string | null =>
  clean(
    properties?.osm_value ||
      properties?.type ||
      properties?.osm_key
  ) || null;

const resultKey = (
  result: OttawaDestinationResult
): string =>
  [
    normalize(result.label),
    result.coordinates.lat.toFixed(5),
    result.coordinates.lng.toFixed(5),
  ].join("|");

export async function searchOttawaDestinations(
  query: string,
  options?: {
    limit?: number;
    signal?: AbortSignal;
  }
): Promise<
  OttawaDestinationResult[]
> {
  const cleanQuery = clean(query);

  if (
    cleanQuery.length <
    MIN_QUERY_LENGTH
  ) {
    return [];
  }

  const limit = Math.min(
    8,
    Math.max(
      1,
      options?.limit ??
        DEFAULT_LIMIT
    )
  );

  const cacheKey =
    `${normalize(cleanQuery)}|${limit}`;

  const cached =
    cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const params =
    new URLSearchParams({
      q: cleanQuery,
      limit: String(
        REQUEST_LIMIT
      ),
      lat: String(OTTAWA_LAT),
      lon: String(OTTAWA_LNG),
      lang: "en",
    });

  const response = await fetch(
    `${PHOTON_URL}?${params.toString()}`,
    {
      method: "GET",
      signal: options?.signal,
      headers: {
        Accept:
          "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Destination search failed (${response.status})`
    );
  }

  const data =
    (await response.json()) as
      PhotonResponse;

  const features =
    Array.isArray(data.features)
      ? data.features
      : [];

  const results: OttawaDestinationResult[] =
    [];

  for (
    let index = 0;
    index < features.length;
    index += 1
  ) {
    const feature =
      features[index];

    const coordinates =
      feature.geometry?.coordinates;

    const lng = Number(
      coordinates?.[0]
    );

    const lat = Number(
      coordinates?.[1]
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !isInsideOttawaBounds(
        lat,
        lng
      )
    ) {
      continue;
    }

    const properties =
      feature.properties;

    const label =
      clean(properties?.name) ||
      [
        clean(
          properties?.housenumber
        ),
        clean(properties?.street),
      ]
        .filter(Boolean)
        .join(" ");

    if (!label) {
      continue;
    }

    const address =
      buildAddress(properties);

    const osmId =
      properties?.osm_id;

    const osmType =
      clean(properties?.osm_type);

    results.push({
      id:
        osmId !== undefined
          ? `photon-${osmType}-${osmId}`
          : `photon-${lat}-${lng}-${index}`,
      label,
      address:
        address || label,
      coordinates: {
        lat,
        lng,
      },
      // Photon ranks results itself. Preserve ordering;
      // score exists for compatibility with the current UI.
      score:
        Math.max(
          1,
          100 - index
        ),
      type:
        getType(properties),
    });
  }

  const unique =
    new Map<
      string,
      OttawaDestinationResult
    >();

  for (const result of results) {
    const key =
      resultKey(result);

    if (!unique.has(key)) {
      unique.set(
        key,
        result
      );
    }
  }

  const finalResults =
    Array.from(
      unique.values()
    ).slice(0, limit);

  cache.set(
    cacheKey,
    finalResults
  );

  return finalResults;
}
