// src/services/ottawaNeighbourhoods.ts

export type OttawaNeighbourhoodProperties = {
  OBJECTID?: number;
  NAME?: string;
  [key: string]: unknown;
};

export type OttawaNeighbourhoodGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

export type OttawaNeighbourhoodFeature = {
  type: "Feature";
  properties: OttawaNeighbourhoodProperties;
  geometry: OttawaNeighbourhoodGeometry;
};

export type OttawaNeighbourhoodFeatureCollection = {
  type: "FeatureCollection";
  features: OttawaNeighbourhoodFeature[];
};

const OTTAWA_NEIGHBOURHOODS_URL =
  "https://maps.ottawa.ca/arcgis/rest/services/Neighbourhoods/MapServer/2/query";

export async function fetchOttawaNeighbourhoods(): Promise<OttawaNeighbourhoodFeatureCollection> {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "OBJECTID,NAME",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });

  const response = await fetch(
    `${OTTAWA_NEIGHBOURHOODS_URL}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Ottawa neighbourhoods: ${response.status} ${response.statusText}`
    );
  }

  const data =
    (await response.json()) as OttawaNeighbourhoodFeatureCollection;

  if (
    data.type !== "FeatureCollection" ||
    !Array.isArray(data.features)
  ) {
    throw new Error("Invalid Ottawa neighbourhood GeoJSON response");
  }

  return data;
}