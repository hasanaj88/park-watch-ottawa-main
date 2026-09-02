// src/components/maps/LeafletParkingMap.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import type { ParkingLot } from "@/types/parking";
import type { Ottawa15MinParkingSegment } from "@/services/ottawa15MinParking";
import type { OttawaPaidStreetParkingSegment } from "@/services/ottawaPaidStreetParking";

type Props = {
  lots: ParkingLot[];
  fifteenMinSegments: Ottawa15MinParkingSegment[];
  paidStreetSegments: OttawaPaidStreetParkingSegment[];
  focusLocation?: {
    lat: number;
    lng: number;
    kind: "lot" | "15min" | "paid";
    targetId: string;
    requestId: number;
  } | null;
  userLocation?: {
    lat: number;
    lng: number;
  } | null;
  selectedLotId: string;
  onLotSelect: (lotId: string) => void;
};

function FitFifteenMinBounds({
  segments,
  enabled,
}: {
  segments: Ottawa15MinParkingSegment[];
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !segments.length) {
      return;
    }

    const points = segments.flatMap((segment) =>
      segment.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number]
      )
    );

    if (!points.length) {
      return;
    }

    map.fitBounds(points, {
      padding: [35, 35],
      maxZoom: 16,
    });
  }, [map, segments, enabled]);

  return null;
}

function FitPaidStreetBounds({
  segments,
  enabled,
}: {
  segments: OttawaPaidStreetParkingSegment[];
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !segments.length) {
      return;
    }

    const points = segments.flatMap((segment) =>
      segment.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number]
      )
    );

    if (!points.length) {
      return;
    }

    map.fitBounds(points, {
      padding: [35, 35],
      maxZoom: 16,
    });
  }, [map, segments, enabled]);

  return null;
}

function FocusNearbyLocation({
  target,
}: {
  target?: {
    lat: number;
    lng: number;
    kind: "lot" | "15min" | "paid";
    targetId: string;
    requestId: number;
  } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }

    if (
      !Number.isFinite(target.lat) ||
      !Number.isFinite(target.lng)
    ) {
      return;
    }

    /*
     * Let layer-fit effects finish first,
     * then focus the actual nearest result.
     */
    const timer =
      window.setTimeout(() => {
        map.flyTo(
          [
            target.lat,
            target.lng,
          ],
          17,
          {
            animate: true,
            duration: 0.8,
          }
        );
      }, 60);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    map,
    target?.lat,
    target?.lng,
    target?.requestId,
  ]);

  return null;
}

export default function LeafletParkingMap({
  lots,
  fifteenMinSegments,
  paidStreetSegments,
  focusLocation,
  userLocation,
  selectedLotId,
  onLotSelect,
}: Props) {
  const ottawa: [number, number] = [
    45.4215,
    -75.6972,
  ];

  const lotLayerRefs = useRef<
    Record<string, L.Marker | null>
  >({});

  const fifteenLayerRefs = useRef<
    Record<string, L.Polyline | null>
  >({});

  const paidLayerRefs = useRef<
    Record<string, L.Polyline | null>
  >({});

  const [showFifteenMin, setShowFifteenMin] =
    useState(true);

  const [showPaidStreet, setShowPaidStreet] =
    useState(false);

  const [isMobile, setIsMobile] =
    useState(() =>
      typeof window !== "undefined"
        ? window.innerWidth <= 640
        : false
    );

  const [showLegend, setShowLegend] =
    useState(() =>
      typeof window !== "undefined"
        ? window.innerWidth > 640
        : true
    );

  useEffect(() => {
    if (
      focusLocation?.kind ===
      "15min"
    ) {
      setShowFifteenMin(true);
    }

    if (
      focusLocation?.kind ===
      "paid"
    ) {
      setShowPaidStreet(true);
    }
  }, [
    focusLocation?.kind,
    focusLocation?.requestId,
  ]);

  useEffect(() => {
    if (!focusLocation) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        const targetId =
          focusLocation.targetId;

        let layer:
          | L.Marker
          | L.Polyline
          | null
          | undefined;

        if (
          focusLocation.kind ===
          "lot"
        ) {
          layer =
            lotLayerRefs.current[
              targetId
            ];
        } else if (
          focusLocation.kind ===
          "15min"
        ) {
          layer =
            fifteenLayerRefs.current[
              targetId
            ];
        } else {
          layer =
            paidLayerRefs.current[
              targetId
            ];
        }

        layer?.openPopup();
      }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    focusLocation?.targetId,
    focusLocation?.kind,
    focusLocation?.requestId,
  ]);

  useEffect(() => {
    const handleResize = () => {
      const mobile =
        window.innerWidth <= 640;

      setIsMobile(mobile);

      if (!mobile) {
        setShowLegend(true);
      }
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  const normalParkingIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `
          <div
            style="
              width: 28px;
              height: 28px;
              border-radius: 8px;
              background: #0f172a;
              border: 2px solid #60a5fa;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              font-weight: 800;
              box-shadow: 0 3px 8px rgba(0,0,0,0.35);
            "
          >
            P
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
      }),
    []
  );

  const liveParkingIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `
          <div
            style="
              width: 30px;
              height: 30px;
              border-radius: 8px;
              background: #16a34a;
              border: 2px solid #bbf7d0;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 17px;
              font-weight: 800;
              box-shadow: 0 3px 9px rgba(0,0,0,0.4);
            "
          >
            P
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -17],
      }),
    []
  );

  const officialCityParkingIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `
          <div
            style="
              width: 30px;
              height: 30px;
              border-radius: 8px;
              background: #0284c7;
              border: 2px solid #bae6fd;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 17px;
              font-weight: 800;
              box-shadow: 0 3px 9px rgba(0,0,0,0.4);
            "
          >
            P
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -17],
      }),
    []
  );

  const selectedParkingIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `
          <div
            style="
              width: 34px;
              height: 34px;
              border-radius: 9px;
              background: #f59e0b;
              border: 3px solid #ffffff;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 19px;
              font-weight: 900;
              box-shadow: 0 4px 12px rgba(0,0,0,0.45);
            "
          >
            P
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -19],
      }),
    []
  );

  const getSegmentMidpoint = (
    coordinates: [number, number][]
  ): [number, number] | null => {
    if (!coordinates.length) {
      return null;
    }

    const first = coordinates[0];
    const last =
      coordinates[coordinates.length - 1];

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

    return [lat, lng];
  };

  const navigateToSegment = (
    coordinates: [number, number][]
  ) => {
    const midpoint =
      getSegmentMidpoint(coordinates);

    if (!midpoint) {
      return;
    }

    const [lat, lng] = midpoint;

    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${lat},${lng}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const formatRoadName = (
    value: string | null
  ) => {
    if (!value) {
      return null;
    }

    return value
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const formatSide = (
    value: string | null
  ) => {
    if (!value) {
      return null;
    }

    const side =
      value.trim().toUpperCase();

    const names: Record<
      string,
      string
    > = {
      N: "North",
      S: "South",
      E: "East",
      W: "West",
    };

    return names[side] ?? value;
  };

  const formatHourlyRate = (
    value: string | null
  ) => {
    if (!value) {
      return null;
    }

    const rate = Number(value);

    if (!Number.isFinite(rate)) {
      return value;
    }

    return `$${rate.toFixed(
      Number.isInteger(rate) ? 0 : 2
    )} / hour`;
  };

  const formatMaxStay = (
    value: string | null
  ) => {
    if (!value) {
      return null;
    }

    const hours = Number(value);

    if (!Number.isFinite(hours)) {
      return value;
    }

    if (hours === 1) {
      return "1 hour";
    }

    return `${hours} hours`;
  };

  return (
    <div
      style={{
        height: "52vh",
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Map Legend */}
      <div
        style={{
          position: "absolute",
          left: isMobile ? 10 : 12,
          bottom: isMobile ? 34 : 28,
          zIndex: 1000,
        }}
      >
        {isMobile && !showLegend ? (
          <button
            type="button"
            onClick={() =>
              setShowLegend(true)
            }
            aria-label="Show map legend"
            style={{
              border:
                "1px solid rgba(255,255,255,0.14)",
              borderRadius: 9,
              padding: "7px 10px",
              background:
                "rgba(15,23,42,0.92)",
              color: "#ffffff",
              boxShadow:
                "0 4px 14px rgba(0,0,0,0.25)",
              backdropFilter: "blur(8px)",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Map Key
          </button>
        ) : (
          <div
            style={{
              minWidth: isMobile
                ? 132
                : 150,
              padding: isMobile
                ? "8px 10px"
                : "10px 12px",
              borderRadius: 10,
              background:
                "rgba(15,23,42,0.92)",
              color: "#ffffff",
              boxShadow:
                "0 4px 14px rgba(0,0,0,0.25)",
              backdropFilter: "blur(8px)",
              border:
                "1px solid rgba(255,255,255,0.14)",
              fontSize: isMobile
                ? 10
                : 11,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: 10,
                marginBottom: 7,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: isMobile
                    ? 11
                    : 12,
                }}
              >
                Parking Map
              </div>

              {isMobile && (
                <button
                  type="button"
                  onClick={() =>
                    setShowLegend(false)
                  }
                  aria-label="Hide map legend"
                  style={{
                    border: "none",
                    background:
                      "transparent",
                    color: "#ffffff",
                    padding: 0,
                    fontSize: 15,
                    lineHeight: 1,
                    cursor: "pointer",
                    opacity: 0.8,
                  }}
                >
                  ×
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 5,
              }}
            >
              <div
                style={{
                  width: isMobile
                    ? 18
                    : 20,
                  height: isMobile
                    ? 18
                    : 20,
                  borderRadius: 6,
                  background:
                    "#16a34a",
                  border:
                    "1px solid #bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  fontWeight: 800,
                  fontSize: 10,
                }}
              >
                P
              </div>
              <span>Live parking</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 5,
              }}
            >
              <div
                style={{
                  width: isMobile
                    ? 18
                    : 20,
                  height: isMobile
                    ? 18
                    : 20,
                  borderRadius: 6,
                  background:
                    "#0284c7",
                  border:
                    "1px solid #bae6fd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  fontWeight: 800,
                  fontSize: 10,
                }}
              >
                P
              </div>
              <span>Official City</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 5,
              }}
            >
              <div
                style={{
                  width: isMobile
                    ? 18
                    : 20,
                  height: isMobile
                    ? 18
                    : 20,
                  borderRadius: 6,
                  background:
                    "#0f172a",
                  border:
                    "1px solid #60a5fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  fontWeight: 800,
                  fontSize: 10,
                }}
              >
                P
              </div>
              <span>Parking lot</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 5,
              }}
            >
              <div
                style={{
                  width: isMobile
                    ? 19
                    : 22,
                  height: 5,
                  borderRadius: 999,
                  background:
                    "#16a34a",
                }}
              />
              <span>15 Min Free</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <div
                style={{
                  width: isMobile
                    ? 19
                    : 22,
                  height: 5,
                  borderRadius: 999,
                  background:
                    "#2563eb",
                }}
              />
              <span>Paid Street</span>
            </div>
          </div>
        )}
      </div>

      {/* 15 Minute Free Toggle */}
      <button
        type="button"
        onClick={() =>
          setShowFifteenMin(
            (current) => !current
          )
        }
        style={{
          position: "absolute",
          top: isMobile ? 10 : 12,
          right: isMobile ? 10 : 12,
          zIndex: 1000,
          border:
            "1px solid rgba(255,255,255,0.18)",
          borderRadius: isMobile ? 9 : 10,
          padding: isMobile
            ? "7px 10px"
            : "9px 13px",
          fontSize: isMobile ? 11 : 13,
          fontWeight: 700,
          cursor: "pointer",
          background: showFifteenMin
            ? "rgba(34,197,94,0.95)"
            : "rgba(15,23,42,0.92)",
          color: "#ffffff",
          boxShadow:
            "0 4px 14px rgba(0,0,0,0.25)",
          backdropFilter: "blur(8px)",
        }}
      >
        {showFifteenMin
          ? "✓ 15 Min Free"
          : "15 Min Free"}
      </button>

      {/* Paid Street Parking Toggle */}
      <button
        type="button"
        onClick={() =>
          setShowPaidStreet(
            (current) => !current
          )
        }
        style={{
          position: "absolute",
          top: isMobile ? 48 : 58,
          right: isMobile ? 10 : 12,
          zIndex: 1000,
          border:
            "1px solid rgba(255,255,255,0.18)",
          borderRadius: isMobile ? 9 : 10,
          padding: isMobile
            ? "7px 10px"
            : "9px 13px",
          fontSize: isMobile ? 11 : 13,
          fontWeight: 700,
          cursor: "pointer",
          background: showPaidStreet
            ? "rgba(37,99,235,0.95)"
            : "rgba(15,23,42,0.92)",
          color: "#ffffff",
          boxShadow:
            "0 4px 14px rgba(0,0,0,0.25)",
          backdropFilter: "blur(8px)",
        }}
      >
        {showPaidStreet
          ? "✓ $ Paid Parking"
          : "$ Paid Parking"}
      </button>

      <MapContainer
        center={ottawa}
        zoom={13}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FocusNearbyLocation
          target={focusLocation}
        />

        {userLocation &&
          Number.isFinite(
            userLocation.lat
          ) &&
          Number.isFinite(
            userLocation.lng
          ) && (
            <CircleMarker
              center={[
                userLocation.lat,
                userLocation.lng,
              ]}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                weight: 3,
                fillColor: "#2563eb",
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div
                  style={{
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    You Are Here
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    Your current location
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )}

        <FitFifteenMinBounds
          segments={fifteenMinSegments}
          enabled={showFifteenMin}
        />

        <FitPaidStreetBounds
          segments={paidStreetSegments}
          enabled={showPaidStreet}
        />

        {/* Existing parking lots */}
        {lots.map((lot) => {
          const coordinates =
            (lot as any).coordinates;

          if (
            !coordinates ||
            !Number.isFinite(
              Number(coordinates.lat)
            ) ||
            !Number.isFinite(
              Number(coordinates.lng)
            )
          ) {
            return null;
          }

          const position: [number, number] = [
            Number(coordinates.lat),
            Number(coordinates.lng),
          ];

          const isSelected =
            String(lot.id) ===
            String(selectedLotId);

          const lotAny = lot as any;

          const isLive =
            lotAny.isLive === true;

          const isCityOfficial =
            lotAny.isCityOfficial === true ||
            lotAny.cityParkingId != null ||
            lotAny.cityLotId != null;

          const isOfficialCityNonLive =
            isCityOfficial && !isLive;

          const liveDataError =
            typeof lotAny.liveDataError === "string" &&
            lotAny.liveDataError.trim().length > 0
              ? lotAny.liveDataError
              : null;

          const isLiveStale =
            isLive && liveDataError !== null;

          const capacity = Number(
            lotAny.capacity ??
              lotAny.total ??
              lotAny.map_capacity
          );

          const free =
            typeof lotAny.free === "number"
              ? lotAny.free
              : typeof lotAny.freeSpaces === "number"
              ? lotAny.freeSpaces
              : null;

          const safeFree =
            free !== null &&
            Number.isFinite(capacity) &&
            capacity > 0
              ? Math.min(
                  capacity,
                  Math.max(0, free)
                )
              : null;

          const liveAvailablePct =
            safeFree !== null &&
            capacity > 0
              ? Math.round(
                  (safeFree / capacity) * 100
                )
              : null;

          const liveUpdatedRaw =
            lotAny.liveLastUpdated;

          const liveUpdatedDate =
            liveUpdatedRaw instanceof Date
              ? liveUpdatedRaw
              : liveUpdatedRaw
              ? new Date(liveUpdatedRaw)
              : null;

          const liveUpdatedText =
            liveUpdatedDate &&
            !Number.isNaN(
              liveUpdatedDate.getTime()
            )
              ? liveUpdatedDate.toLocaleTimeString(
                  [],
                  {
                    hour: "numeric",
                    minute: "2-digit",
                  }
                )
              : null;

          const navigateToLot = () => {
            const url =
              `https://www.google.com/maps/dir/?api=1` +
              `&destination=${position[0]},${position[1]}`;

            window.open(
              url,
              "_blank",
              "noopener,noreferrer"
            );
          };

          const icon = isSelected
            ? selectedParkingIcon
            : isLive
            ? liveParkingIcon
            : isOfficialCityNonLive
            ? officialCityParkingIcon
            : normalParkingIcon;

          return (
            <Marker
              key={String(lot.id)}
              position={position}
              icon={icon}
              ref={(layer) => {
                lotLayerRefs.current[
                  `lot-${String(lot.id)}`
                ] = layer;
              }}
            >
              <Popup>
                <div
                  style={{
                    width: isMobile
                      ? "min(230px, calc(100vw - 96px))"
                      : undefined,
                    minWidth: isMobile
                      ? 0
                      : isLive ||
                        isOfficialCityNonLive
                      ? 225
                      : 160,
                    maxWidth: isMobile
                      ? "calc(100vw - 96px)"
                      : 280,
                    lineHeight: 1.45,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                    }}
                  >
                    {lot.name}
                  </div>

                  {isLive && (
                    <>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          fontWeight: 800,
                          color: isLiveStale
                            ? "#d97706"
                            : "#16a34a",
                        }}
                      >
                        {isLiveStale
                          ? "⚠ LAST KNOWN"
                          : "● LIVE"}{" "}
                        · City of Ottawa
                      </div>

                      {safeFree !== null &&
                        capacity > 0 && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: "8px 10px",
                              borderRadius: 8,
                              background:
                                "rgba(22,163,74,0.08)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 800,
                              }}
                            >
                              {safeFree} free /{" "}
                              {capacity}
                            </div>

                            {liveAvailablePct !==
                              null && (
                              <div
                                style={{
                                  marginTop: 2,
                                  fontSize: 12,
                                  color: "#64748b",
                                }}
                              >
                                {liveAvailablePct}%
                                available
                              </div>
                            )}
                          </div>
                        )}

                      {liveUpdatedText && (
                        <div
                          style={{
                            marginTop: 7,
                            fontSize: 11,
                            color: "#64748b",
                          }}
                        >
                          {isLiveStale
                            ? "Last successful update"
                            : "Last updated"}
                          : {liveUpdatedText}
                        </div>
                      )}

                      {isLiveStale && (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: "#d97706",
                          }}
                        >
                          Live update temporarily
                          unavailable
                        </div>
                      )}
                    </>
                  )}

                  {isOfficialCityNonLive && (
                    <>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#0284c7",
                        }}
                      >
                        ● OFFICIAL CITY PARKING
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          padding: "8px 10px",
                          borderRadius: 8,
                          background:
                            "rgba(2,132,199,0.08)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          Availability currently
                          unavailable
                        </div>

                        {Number.isFinite(
                          capacity
                        ) &&
                          capacity > 0 && (
                            <div
                              style={{
                                marginTop: 3,
                                fontSize: 12,
                                color:
                                  "#64748b",
                              }}
                            >
                              Capacity:{" "}
                              {capacity} spaces
                            </div>
                          )}
                      </div>

                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        City of Ottawa
                      </div>
                    </>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onLotSelect(
                          String(lot.id)
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "7px 9px",
                        border: "none",
                        borderRadius: 7,
                        cursor: "pointer",
                        background: isLive
                          ? "#16a34a"
                          : isOfficialCityNonLive
                          ? "#0284c7"
                          : "#0f172a",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {isSelected
                        ? "Selected"
                        : "View Details"}
                    </button>

                    <button
                      type="button"
                      onClick={navigateToLot}
                      style={{
                        flex: 1,
                        padding: "7px 9px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 7,
                        cursor: "pointer",
                        background: "#ffffff",
                        color: "#0f172a",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      Navigate
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 15 Minute Free Parking */}
        {showFifteenMin &&
          fifteenMinSegments.map(
            (segment) => {
              const positions: [
                number,
                number
              ][] =
                segment.coordinates.map(
                  ([lng, lat]) => [
                    lat,
                    lng,
                  ]
                );

              if (
                positions.length < 2
              ) {
                return null;
              }

              return (
                <Polyline
                  key={`15min-${segment.id}`}
                  ref={(layer) => {
                    fifteenLayerRefs.current[
                      `15min-${String(
                        segment.id
                      )}`
                    ] = layer;
                  }}
                  positions={positions}
                  pathOptions={{
                    color: "#16a34a",
                    weight: 10,
                    opacity: 1,
                  }}
                >
                  <Popup>
                    <div
                      style={{
                        width: isMobile
                          ? "min(230px, calc(100vw - 96px))"
                          : undefined,
                        minWidth: isMobile
                          ? 0
                          : 200,
                        maxWidth: isMobile
                          ? "calc(100vw - 96px)"
                          : 280,
                        lineHeight: 1.45,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          marginBottom: 6,
                        }}
                      >
                        15 Minute Free
                        Parking
                      </div>

                      <div>
                        Regulation:{" "}
                        <strong>
                          {
                            segment.regulation
                          }
                        </strong>
                      </div>

                      {segment.duration && (
                        <div>
                          Hours:{" "}
                          {
                            segment.duration
                          }
                        </div>
                      )}

                      {segment.day && (
                        <div>
                          Days:{" "}
                          {segment.day}
                        </div>
                      )}

                      {segment.notes && (
                        <div>
                          Notes:{" "}
                          {
                            segment.notes
                          }
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          navigateToSegment(
                            segment.coordinates
                          )
                        }
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding:
                            "8px 10px",
                          border: "none",
                          borderRadius: 8,
                          cursor:
                            "pointer",
                          background:
                            "#16a34a",
                          color:
                            "#ffffff",
                          fontWeight: 700,
                        }}
                      >
                        Navigate
                      </button>

                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 11,
                          opacity: 0.7,
                        }}
                      >
                        City of Ottawa
                      </div>
                    </div>
                  </Popup>
                </Polyline>
              );
            }
          )}

        {/* Paid Street Parking */}
        {showPaidStreet &&
          paidStreetSegments.map(
            (segment) => {
              const positions: [
                number,
                number
              ][] =
                segment.coordinates.map(
                  ([lng, lat]) => [
                    lat,
                    lng,
                  ]
                );

              if (
                positions.length < 2
              ) {
                return null;
              }

              const road =
                formatRoadName(
                  segment.road
                );

              const from =
                formatRoadName(
                  segment.from
                );

              const to =
                formatRoadName(
                  segment.to
                );

              const side =
                formatSide(
                  segment.side
                );

              const hourlyRate =
                formatHourlyRate(
                  segment.hourlyRate
                );

              const maxStay =
                formatMaxStay(
                  segment.maxStay
                );

              return (
                <Polyline
                  key={`paid-${segment.id}`}
                  ref={(layer) => {
                    paidLayerRefs.current[
                      `paid-${String(
                        segment.id
                      )}`
                    ] = layer;
                  }}
                  positions={positions}
                  pathOptions={{
                    color: "#2563eb",
                    weight: 7,
                    opacity: 0.9,
                  }}
                >
                  <Popup>
                    <div
                      style={{
                        width: isMobile
                          ? "min(230px, calc(100vw - 96px))"
                          : undefined,
                        minWidth: isMobile
                          ? 0
                          : 220,
                        maxWidth: isMobile
                          ? "calc(100vw - 96px)"
                          : 300,
                        lineHeight: 1.5,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          marginBottom: 7,
                        }}
                      >
                        Paid Street
                        Parking
                      </div>

                      {road && (
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: 5,
                          }}
                        >
                          {road}
                        </div>
                      )}

                      {hourlyRate && (
                        <div>
                          Rate:{" "}
                          <strong>
                            {hourlyRate}
                          </strong>
                        </div>
                      )}

                      {maxStay && (
                        <div>
                          Max Stay:{" "}
                          <strong>
                            {maxStay}
                          </strong>
                        </div>
                      )}

                      {side && (
                        <div>
                          Side: {side}
                        </div>
                      )}

                      {from && to && (
                        <div>
                          From: {from}
                          <br />
                          To: {to}
                        </div>
                      )}

                      {segment.parkingSupply !==
                        null && (
                        <div
                          style={{
                            marginTop: 6,
                          }}
                        >
                          Total Spaces:{" "}
                          <strong>
                            {
                              segment.parkingSupply
                            }
                          </strong>
                        </div>
                      )}

                      {segment.availableSpaces !==
                        null && (
                        <div>
                          Usable Spaces:{" "}
                          <strong>
                            {
                              segment.availableSpaces
                            }
                          </strong>
                        </div>
                      )}

                      {segment.outOfService !==
                        null &&
                        segment.outOfService >
                          0 && (
                          <div>
                            Out of Service:{" "}
                            <strong>
                              {
                                segment.outOfService
                              }
                            </strong>
                          </div>
                        )}

                      <button
                        type="button"
                        onClick={() =>
                          navigateToSegment(
                            segment.coordinates
                          )
                        }
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding:
                            "8px 10px",
                          border: "none",
                          borderRadius: 8,
                          cursor:
                            "pointer",
                          background:
                            "#2563eb",
                          color:
                            "#ffffff",
                          fontWeight: 700,
                        }}
                      >
                        Navigate
                      </button>

                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 11,
                          opacity: 0.7,
                        }}
                      >
                        City of Ottawa
                      </div>
                    </div>
                  </Popup>
                </Polyline>
              );
            }
          )}
      </MapContainer>
    </div>
  );
}