// src/utils/dedupParkings.ts
export function dedupParkings(items: any[]) {
  const seen = new Set<string>();
  const result = [];

  for (const p of items) {
    const lat = Number(p.lat).toFixed(6);
    const lng = Number(p.lng).toFixed(6);

    const key =
      p.id ??
      p.facilityId ??
      `${lat},${lng}-${(p.name || p.address || "").toLowerCase()}`;

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(p);
  }

  return result;
}
