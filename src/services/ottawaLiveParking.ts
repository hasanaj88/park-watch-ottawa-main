export type OttawaLiveParkingLot = {
  id: number;
  lotId: number;
  address: string | null;
  latitude: number;
  longitude: number;
  capacity: number | null;
  freeSpaces: number | null;
  freeAccessibleSpaces: number | null;
  type: string | null;
};

const PARKING_URL =
  "https://traffic.ottawa.ca/map/service/parking";

type OttawaParkingApiLot = {
  id?: number;
  lot_id?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  freeSpaces?: number | string;
  freeAccessibleSpaces?: number | string;
  type?: string;
};

type OttawaParkingApiResponse = {
  parking_lots?: OttawaParkingApiLot[];
};

function normalizeNumber(
  value: number | string | null | undefined
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "N/A"
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export async function fetchOttawaLiveParking(): Promise<
  OttawaLiveParkingLot[]
> {
  const response = await fetch(PARKING_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Ottawa live parking: ${response.status}`
    );
  }

  const data =
    (await response.json()) as OttawaParkingApiResponse;

  const lots = Array.isArray(data.parking_lots)
    ? data.parking_lots
    : [];

  return lots
    .filter(
      (lot) =>
        lot.id != null &&
        lot.lot_id != null &&
        Number.isFinite(Number(lot.latitude)) &&
        Number.isFinite(Number(lot.longitude))
    )
    .map((lot) => ({
      id: Number(lot.id),
      lotId: Number(lot.lot_id),

      address:
        lot.address?.trim() || null,

      latitude: Number(lot.latitude),
      longitude: Number(lot.longitude),

      capacity: normalizeNumber(
        lot.capacity
      ),

      freeSpaces: normalizeNumber(
        lot.freeSpaces
      ),

      freeAccessibleSpaces: normalizeNumber(
        lot.freeAccessibleSpaces
      ),

      type:
        lot.type?.trim() || null,
    }));
}