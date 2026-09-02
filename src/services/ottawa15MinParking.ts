export type Ottawa15MinParkingSegment = {
  id: number;
  regulation: string;
  duration: string | null;
  day: string | null;
  notes: string | null;
  angled: string | null;
  inUse: string | null;
  coordinates: [number, number][];
};

const OTTAWA_15_MIN_API =
  "https://maps.ottawa.ca/arcgis/rest/services/Parking/MapServer/1/query?where=REGULATION%3D%2715%20MIN%27&outFields=OBJECTID,REGULATION,DURATION,DAY,NOTES,ANGLED,IN_USE&returnGeometry=true&outSR=4326&f=geojson";

type GeoJsonFeature = {
  properties: {
    OBJECTID: number;
    REGULATION: string | null;
    DURATION: string | null;
    DAY: string | null;
    NOTES: string | null;
    ANGLED: string | null;
    IN_USE: string | null;
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

function normalizeDuration(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();

  if (
    normalized === "o" ||
    normalized === "other - see notes" ||
    normalized === "unsigned"
  ) {
    return null;
  }

  return trimmed;
}

function normalizeText(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

export async function fetchOttawa15MinParking(): Promise<
  Ottawa15MinParkingSegment[]
> {
  const response = await fetch(OTTAWA_15_MIN_API);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Ottawa 15-minute parking: ${response.status}`
    );
  }

  const data = (await response.json()) as GeoJsonResponse;

  if (!Array.isArray(data.features)) {
    return [];
  }

  return data.features
    .filter(
      (feature) =>
        feature?.properties?.OBJECTID != null &&
        feature?.geometry?.type === "LineString" &&
        Array.isArray(feature.geometry.coordinates)
    )
    .map((feature) => ({
      id: feature.properties.OBJECTID,
      regulation:
        normalizeText(feature.properties.REGULATION) ??
        "15 MIN",
      duration: normalizeDuration(
        feature.properties.DURATION
      ),
      day: normalizeText(feature.properties.DAY),
      notes: normalizeText(feature.properties.NOTES),
      angled: normalizeText(feature.properties.ANGLED),
      inUse: normalizeText(feature.properties.IN_USE),
      coordinates: feature.geometry.coordinates,
    }));
}