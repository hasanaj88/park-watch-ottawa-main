// src/services/ottawaDestinationParking.ts

export type OttawaDiscoveredParking = {
  id: string;
  name: string;
  address: string | null;
  coordinates: {
    lat: number;
    lng: number;
  };
  osmType: string | null;
  osmId: number | string | null;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type PhotonFeature = {
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: {
    name?: unknown;
    street?: unknown;
    housenumber?: unknown;
    postcode?: unknown;
    city?: unknown;
    countrycode?: unknown;
    osm_key?: unknown;
    osm_value?: unknown;
    osm_type?: unknown;
    osm_id?: unknown;
  };
};

type PhotonFeatureCollection = {
  features?: PhotonFeature[];
};

const OVERPASS_URL =
  "https://overpass-api.de/api/interpreter";

const PHOTON_REVERSE_URL =
  "https://photon.komoot.io/reverse";

const requestCache = new Map<
  string,
  OttawaDiscoveredParking[]
>();

const asText = (
  value: unknown
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();
  return clean ? clean : null;
};

const normalizeAccess = (
  value: string | undefined
) => value?.trim().toLowerCase() ?? null;

const isUsableCarParking = (
  tags: Record<string, string>
): boolean => {
  const isParkingFacility =
    tags.amenity === "parking";

  const isParkingEntrance =
    tags.amenity === "parking_entrance";

  const isParkingSite =
    tags.site === "parking";

  if (
    !isParkingFacility &&
    !isParkingEntrance &&
    !isParkingSite
  ) {
    return false;
  }

  const access =
    normalizeAccess(tags.access);

  // Do not recommend parking that OSM explicitly marks
  // as unavailable to the general/customer public.
  if (
    access === "private" ||
    access === "no"
  ) {
    return false;
  }

  const parking =
    tags.parking?.trim().toLowerCase();

  // Exclude clearly non-car facilities if oddly tagged.
  if (
    parking === "bicycle" ||
    parking === "motorcycle"
  ) {
    return false;
  }

  return true;
};

const buildAddressFromTags = (
  tags: Record<string, string>
): string | null => {
  const house =
    asText(tags["addr:housenumber"]);

  const street =
    asText(tags["addr:street"]);

  const city =
    asText(tags["addr:city"]);

  const postcode =
    asText(tags["addr:postcode"]);

  const streetLine = [
    house,
    street,
  ]
    .filter(Boolean)
    .join(" ");

  const localityLine = [
    city,
    postcode,
  ]
    .filter(Boolean)
    .join(" ");

  const result = [
    streetLine,
    localityLine,
  ]
    .filter(Boolean)
    .join(", ");

  return result || null;
};

const getOverpassPoint = (
  element: OverpassElement
): {
  lat: number;
  lng: number;
} | null => {
  const lat = Number(
    element.lat ??
      element.center?.lat
  );

  const lng = Number(
    element.lon ??
      element.center?.lon
  );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return {
    lat,
    lng,
  };
};

const buildOverpassName = (
  tags: Record<string, string>,
  address: string | null
): string => {
  const name =
    asText(tags.name);

  const operator =
    asText(tags.operator);

  const isEntrance =
    tags.amenity ===
    "parking_entrance";

  if (isEntrance) {
    if (name) {
      return `${name} Parking Entrance`;
    }

    if (operator) {
      return `${operator} Parking Entrance`;
    }

    if (address) {
      return `${address} Parking Entrance`;
    }

    return "Parking Entrance";
  }

  if (name) {
    return name;
  }

  if (operator) {
    return `${operator} Parking`;
  }

  if (address) {
    return `${address} Parking`;
  }

  const parkingType =
    asText(tags.parking);

  if (parkingType === "multi-storey") {
    return "Parking Garage";
  }

  if (parkingType === "underground") {
    return "Underground Parking";
  }

  if (parkingType === "surface") {
    return "Surface Parking";
  }

  return "Parking";
};

const fetchOverpassParking =
  async (
    origin: {
      lat: number;
      lng: number;
    },
    radiusKm: number,
    signal: AbortSignal
  ): Promise<
    OttawaDiscoveredParking[]
  > => {
    const radiusMeters =
      Math.max(
        100,
        Math.round(
          radiusKm * 1000
        )
      );

    /*
     * nwr = nodes + ways + relations.
     * `out tags center` is important: large mall garages and
     * surface lots are often mapped as ways/relations rather
     * than POI nodes. Photon can miss those as nearby POIs.
     */
    const query = `
[out:json][timeout:12];
(
  nwr["amenity"="parking"](around:${radiusMeters},${origin.lat},${origin.lng});
  nwr["amenity"="parking_entrance"](around:${radiusMeters},${origin.lat},${origin.lng});
  nwr["site"="parking"](around:${radiusMeters},${origin.lat},${origin.lng});
);
out tags center;
`.trim();

    const response =
      await fetch(
        `${OVERPASS_URL}?data=${encodeURIComponent(
          query
        )}`,
        {
          signal,
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    if (!response.ok) {
      throw new Error(
        `Overpass parking discovery failed (${response.status})`
      );
    }

    const payload =
      (await response.json()) as
        OverpassResponse;

    const elements =
      Array.isArray(payload.elements)
        ? payload.elements
        : [];

    return elements
      .map((element) => {
        const tags =
          element.tags ?? {};

        if (
          !isUsableCarParking(
            tags
          )
        ) {
          return null;
        }

        const coordinates =
          getOverpassPoint(
            element
          );

        if (!coordinates) {
          return null;
        }

        const address =
          buildAddressFromTags(
            tags
          );

        return {
          id: `osm-parking-${element.type}-${element.id}`,
          name:
            buildOverpassName(
              tags,
              address
            ),
          address,
          coordinates,
          osmType:
            element.type,
          osmId:
            element.id,
        } satisfies OttawaDiscoveredParking;
      })
      .filter(
        (
          item
        ): item is OttawaDiscoveredParking =>
          item !== null
      );
  };

const buildPhotonAddress = (
  properties:
    PhotonFeature["properties"]
): string | null => {
  if (!properties) {
    return null;
  }

  const house =
    asText(
      properties.housenumber
    );

  const street =
    asText(
      properties.street
    );

  const city =
    asText(
      properties.city
    );

  const postcode =
    asText(
      properties.postcode
    );

  const streetLine = [
    house,
    street,
  ]
    .filter(Boolean)
    .join(" ");

  const localityLine = [
    city,
    postcode,
  ]
    .filter(Boolean)
    .join(" ");

  const result = [
    streetLine,
    localityLine,
  ]
    .filter(Boolean)
    .join(", ");

  return result || null;
};

const fetchPhotonFallback =
  async (
    origin: {
      lat: number;
      lng: number;
    },
    radiusKm: number,
    limit: number,
    signal: AbortSignal
  ): Promise<
    OttawaDiscoveredParking[]
  > => {
    const params =
      new URLSearchParams({
        lat: String(origin.lat),
        lon: String(origin.lng),
        radius:
          String(radiusKm),
        limit:
          String(limit),
        lang: "en",
      });

    params.append(
      "osm_tag",
      "amenity:parking"
    );

    const response =
      await fetch(
        `${PHOTON_REVERSE_URL}?${params.toString()}`,
        {
          signal,
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    if (!response.ok) {
      throw new Error(
        `Photon parking discovery failed (${response.status})`
      );
    }

    const payload =
      (await response.json()) as
        PhotonFeatureCollection;

    const features =
      Array.isArray(
        payload.features
      )
        ? payload.features
        : [];

    return features
      .map((feature) => {
        if (
          feature.geometry?.type !==
            "Point" ||
          !Array.isArray(
            feature.geometry
              .coordinates
          )
        ) {
          return null;
        }

        const [lngRaw, latRaw] =
          feature.geometry
            .coordinates;

        const lat =
          Number(latRaw);

        const lng =
          Number(lngRaw);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return null;
        }

        const properties =
          feature.properties ?? {};

        if (
          asText(
            properties.osm_key
          ) !== "amenity" ||
          asText(
            properties.osm_value
          ) !== "parking"
        ) {
          return null;
        }

        const address =
          buildPhotonAddress(
            properties
          );

        const osmType =
          asText(
            properties.osm_type
          );

        const osmIdRaw =
          properties.osm_id;

        const osmId =
          typeof osmIdRaw ===
            "number" ||
          typeof osmIdRaw ===
            "string"
            ? osmIdRaw
            : null;

        const name =
          asText(
            properties.name
          ) ??
          (address
            ? `${address} Parking`
            : "Parking");

        return {
          id:
            `osm-parking-${
              osmType ?? "x"
            }-${
              osmId ??
              `${lat.toFixed(
                6
              )}-${lng.toFixed(
                6
              )}`
            }`,
          name,
          address,
          coordinates: {
            lat,
            lng,
          },
          osmType,
          osmId,
        } satisfies OttawaDiscoveredParking;
      })
      .filter(
        (
          item
        ): item is OttawaDiscoveredParking =>
          item !== null
      );
  };

export const discoverOttawaDestinationParking =
  async (
    origin: {
      lat: number;
      lng: number;
    },
    options: {
      radiusKm?: number;
      limit?: number;
      signal?: AbortSignal;
    } = {}
  ): Promise<
    OttawaDiscoveredParking[]
  > => {
    const radiusKm =
      options.radiusKm ?? 2;

    const limit =
      options.limit ?? 30;

    const cacheKey = [
      origin.lat.toFixed(4),
      origin.lng.toFixed(4),
      radiusKm.toFixed(1),
      limit,
      "overpass-v2-entrances",
    ].join(":");

    const cached =
      requestCache.get(
        cacheKey
      );

    if (cached) {
      return cached;
    }

    const controller =
      new AbortController();

    const abortFromCaller =
      () =>
        controller.abort();

    options.signal
      ?.addEventListener(
        "abort",
        abortFromCaller,
        { once: true }
      );

    const timeoutId =
      window.setTimeout(
        () =>
          controller.abort(),
        15000
      );

    try {
      let results:
        OttawaDiscoveredParking[] =
          [];

      try {
        results =
          await fetchOverpassParking(
            origin,
            radiusKm,
            controller.signal
          );
      } catch (error) {
        if (
          controller.signal
            .aborted
        ) {
          throw error;
        }

        // Public Overpass can occasionally be busy.
        // Keep Photon as a graceful fallback.
        results =
          await fetchPhotonFallback(
            origin,
            radiusKm,
            limit,
            controller.signal
          );
      }

      const unique =
        Array.from(
          new Map(
            results.map(
              (item) => [
                item.id,
                item,
              ]
            )
          ).values()
        );

      requestCache.set(
        cacheKey,
        unique
      );

      return unique;
    } finally {
      window.clearTimeout(
        timeoutId
      );

      options.signal
        ?.removeEventListener(
          "abort",
          abortFromCaller
        );
    }
  };
