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
  entranceCount?: number;
  accessStatus:
    | "public"
    | "customers"
    | "permit"
    | "residents"
    | "restricted"
    | "unknown";
  accessLabel: string;
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

type InternalDiscoveredParking = OttawaDiscoveredParking & {
  discoveryType: "facility" | "entrance" | "site";
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


const classifyParkingAccess = (
  tags: Record<string, string>
): Pick<
  OttawaDiscoveredParking,
  "accessStatus" | "accessLabel"
> => {
  const access = normalizeAccess(tags.access);

  if (
    access === "yes" ||
    access === "public" ||
    access === "permissive"
  ) {
    return {
      accessStatus: "public",
      accessLabel: "Public parking",
    };
  }

  if (
    access === "customers" ||
    access === "customer"
  ) {
    return {
      accessStatus: "customers",
      accessLabel: "Customers only",
    };
  }

  if (
    access === "permit" ||
    access === "permit_holders"
  ) {
    return {
      accessStatus: "permit",
      accessLabel: "Permit required",
    };
  }

  if (
    access === "residents" ||
    access === "resident"
  ) {
    return {
      accessStatus: "residents",
      accessLabel: "Residents only",
    };
  }

  if (
    access === "destination" ||
    access === "delivery" ||
    access === "employees" ||
    access === "employee"
  ) {
    return {
      accessStatus: "restricted",
      accessLabel: "Restricted access",
    };
  }

  /*
   * Missing OSM access data is NOT treated as public.
   * This is important around restaurants, shops and offices,
   * where a mapped surface lot may belong to the property.
   */
  return {
    accessStatus: "unknown",
    accessLabel: "Access not verified",
  };
};

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


const distanceMeters = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number => {
  const R = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const groupParkingFacilities = (
  items: InternalDiscoveredParking[],
  origin: { lat: number; lng: number }
): OttawaDiscoveredParking[] => {
  const rawFacilities = items.filter((item) => item.discoveryType !== "entrance");
  const entrances = items.filter((item) => item.discoveryType === "entrance");

  // OSM sometimes represents the same facility as both amenity=parking and site=parking.
  // Collapse near-identical facility anchors before assigning entrances.
  const facilities: InternalDiscoveredParking[] = [];
  for (const candidate of rawFacilities.sort(
    (a, b) => distanceMeters(a.coordinates, origin) - distanceMeters(b.coordinates, origin)
  )) {
    const duplicate = facilities.find(
      (existing) => distanceMeters(existing.coordinates, candidate.coordinates) <= 60
    );
    if (!duplicate) facilities.push(candidate);
  }

  const assigned = new Set<string>();
  const grouped: OttawaDiscoveredParking[] = facilities.map((facility) => {
    const nearbyEntrances = entrances.filter(
      (entrance) => distanceMeters(entrance.coordinates, facility.coordinates) <= 200
    );

    nearbyEntrances.forEach((entrance) => assigned.add(entrance.id));

    const nearestEntrance = nearbyEntrances
      .slice()
      .sort(
        (a, b) =>
          distanceMeters(a.coordinates, origin) -
          distanceMeters(b.coordinates, origin)
      )[0];

    const accessSource =
      facility.accessStatus !== "unknown"
        ? facility
        : nearbyEntrances.find(
            (entrance) =>
              entrance.accessStatus !== "unknown"
          ) ?? facility;

    return {
      id: facility.id,
      name: facility.name,
      address: facility.address,
      // Navigate to the entrance closest to the destination rather than a polygon centroid.
      coordinates: nearestEntrance?.coordinates ?? facility.coordinates,
      osmType: facility.osmType,
      osmId: facility.osmId,
      entranceCount: nearbyEntrances.length || undefined,
      accessStatus: accessSource.accessStatus,
      accessLabel: accessSource.accessLabel,
    };
  });

  // Entrances with no mapped facility are spatially clustered so a garage with several
  // entrance nodes still appears as one parking choice.
  const remaining = entrances
    .filter((entrance) => !assigned.has(entrance.id))
    .sort(
      (a, b) => distanceMeters(a.coordinates, origin) - distanceMeters(b.coordinates, origin)
    );

  while (remaining.length) {
    const seed = remaining.shift()!;
    const cluster = [seed];
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      if (distanceMeters(seed.coordinates, remaining[i].coordinates) <= 150) {
        cluster.push(remaining[i]);
        remaining.splice(i, 1);
      }
    }

    const nearest = cluster
      .slice()
      .sort(
        (a, b) =>
          distanceMeters(a.coordinates, origin) -
          distanceMeters(b.coordinates, origin)
      )[0];
    const named = cluster.find((item) => item.name !== "Parking Entrance");

    const accessSource =
      cluster.find(
        (item) =>
          item.accessStatus !== "unknown"
      ) ?? nearest;

    grouped.push({
      id: `osm-parking-cluster-${nearest.osmType ?? "x"}-${nearest.osmId ?? nearest.id}`,
      name: named?.name.replace(/ Parking Entrance$/, " Parking") ?? "Parking Garage",
      address: named?.address ?? nearest.address,
      coordinates: nearest.coordinates,
      osmType: nearest.osmType,
      osmId: nearest.osmId,
      entranceCount: cluster.length,
      accessStatus: accessSource.accessStatus,
      accessLabel: accessSource.accessLabel,
    });
  }

  return grouped.sort(
    (a, b) => distanceMeters(a.coordinates, origin) - distanceMeters(b.coordinates, origin)
  );
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

    const discovered = elements
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

        const access =
          classifyParkingAccess(
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
          ...access,
          discoveryType:
            tags.amenity === "parking_entrance"
              ? "entrance"
              : tags.site === "parking" && tags.amenity !== "parking"
                ? "site"
                : "facility",
        } satisfies InternalDiscoveredParking;
      })
      .filter(
        (
          item
        ): item is InternalDiscoveredParking =>
          item !== null
      );

    return groupParkingFacilities(discovered, origin);
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
          accessStatus: "unknown",
          accessLabel: "Access not verified",
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
      "overpass-v4-access",
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
