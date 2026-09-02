export type OttawaPaidStreetParkingSegment = {
  id: number;
  road: string | null;
  side: string | null;
  parkingSupply: number | null;
  availableSpaces: number | null;
  outOfService: number | null;
  daysInEffect: string | null;
  maxStay: string | null;
  hourlyRate: string | null;
  from: string | null;
  to: string | null;
  coordinates: [number, number][];
};

const BASE_URL =
  "https://maps.ottawa.ca/arcgis/rest/services/Parking/MapServer/2/query";

const PAGE_SIZE = 1000;

type GeoJsonFeature = {
  properties: {
    OBJECTID: number;
    ROAD: string | null;
    SIDE: string | null;
    PARKING_SUPPLY: number | null;
    AVAILABLE_SPACES: number | null;
    OUT_OF_SERVICE: number | null;
    DAYS_IN_EFFECT: string | null;
    MAX_STAY: string | null;
    HOURLY_RATE: string | null;
    FROM1: string | null;
    TO1: string | null;
  };
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

type GeoJsonResponse = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

function normalizeText(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();

  return trimmed || null;
}

function normalizeNumber(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

async function fetchPage(
  offset: number
): Promise<GeoJsonFeature[]> {
  const params = new URLSearchParams({
    where: "1=1",
    outFields:
      "OBJECTID,ROAD,SIDE,PARKING_SUPPLY,AVAILABLE_SPACES,OUT_OF_SERVICE,DAYS_IN_EFFECT,MAX_STAY,HOURLY_RATE,FROM1,TO1",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
  });

  const response = await fetch(
    `${BASE_URL}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Ottawa paid street parking: ${response.status}`
    );
  }

  const data =
    (await response.json()) as GeoJsonResponse;

  if (!Array.isArray(data.features)) {
    return [];
  }

  return data.features;
}

export async function fetchOttawaPaidStreetParking(): Promise<
  OttawaPaidStreetParkingSegment[]
> {
  const allFeatures: GeoJsonFeature[] = [];

  let offset = 0;

  while (true) {
    const features = await fetchPage(offset);

    allFeatures.push(...features);

    if (features.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return allFeatures
    .filter(
      (feature) =>
        feature?.properties?.OBJECTID != null &&
        feature?.geometry?.type === "LineString" &&
        Array.isArray(
          feature.geometry.coordinates
        ) &&
        feature.geometry.coordinates.length >= 2
    )
    .map((feature) => ({
      id: feature.properties.OBJECTID,

      road: normalizeText(
        feature.properties.ROAD
      ),

      side: normalizeText(
        feature.properties.SIDE
      ),

      parkingSupply: normalizeNumber(
        feature.properties.PARKING_SUPPLY
      ),

      availableSpaces: normalizeNumber(
        feature.properties.AVAILABLE_SPACES
      ),

      outOfService: normalizeNumber(
        feature.properties.OUT_OF_SERVICE
      ),

      daysInEffect: normalizeText(
        feature.properties.DAYS_IN_EFFECT
      ),

      maxStay: normalizeText(
        feature.properties.MAX_STAY
      ),

      hourlyRate: normalizeText(
        feature.properties.HOURLY_RATE
      ),

      from: normalizeText(
        feature.properties.FROM1
      ),

      to: normalizeText(
        feature.properties.TO1
      ),

      coordinates:
        feature.geometry.coordinates,
    }));
}