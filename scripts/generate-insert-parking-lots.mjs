// scripts/generate-insert-parking-lots.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const inputPath = path.resolve("src/data/parking-lots.ts");
const outPath = path.resolve("scripts/insert_extended_parking_lots.sql");

const ts = fs.readFileSync(inputPath, "utf8");

// 1) Transform TS -> runnable JS in VM
let js = ts;

// remove import lines
js = js.replace(/^import\s+.*?;\s*$/gm, "");

// remove type annotations like ": ParkingLot[]"
js = js.replace(/:\s*ParkingLot\[\]\s*=/g, " =");

// replace "export const X =" -> "var X ="
js = js.replace(/export\s+const\s+/g, "var ");

// replace lastUpdated: new Date() -> null (Date object)
js = js.replace(/lastUpdated:\s*new Date\(\)\s*/g, "lastUpdated: null");

// Remove TS-only "as ParkingLot[]" or similar if exists
js = js.replace(/\s+as\s+ParkingLot\[\]/g, "");

// Now run in VM
const context = {};
vm.createContext(context);

try {
  vm.runInContext(js, context, { timeout: 2000 });
} catch (e) {
  console.error("❌ Failed to evaluate parking-lots.ts after transform.");
  console.error(e);
  process.exit(1);
}

const lots = context.EXTENDED_PARKING_LOTS || context.INITIAL_PARKING_LOTS;

if (!Array.isArray(lots) || lots.length === 0) {
  console.error("❌ Could not find EXTENDED_PARKING_LOTS (or it was empty).");
  console.error("Available keys:", Object.keys(context));
  process.exit(1);
}

// Map to DB columns
const rows = lots.map((lot) => {
  const name = String(lot.name ?? "").trim();
  const capacity = Number(lot.capacity ?? 0);
  const occupied = Number(lot.occupied ?? 0);
  const available = Math.max(0, capacity - occupied);

  const lat = lot.coordinates?.lat ?? null;
  const lng = lot.coordinates?.lng ?? null;

  // normalize status to match your DB style:
  // available -> open, busy -> busy, full -> full, closed -> closed, else -> unknown
  const rawStatus = String(lot.status ?? "unknown").toLowerCase();
  let status = "unknown";
  if (rawStatus === "available" || rawStatus === "open") status = "open";
  else if (rawStatus === "busy") status = "busy";
  else if (rawStatus === "full") status = "full";
  else if (rawStatus === "closed") status = "closed";
  else if (rawStatus === "estimated") status = "estimated";

  // escape name for SQL
  const safeName = name.replace(/'/g, "''");

  return { name: safeName, capacity, available, status, lat, lng };
});

// Build SQL (insert only if name not exists, case-insensitive)
const valuesSql = rows
  .map((r) => {
    const latVal = r.lat === null ? "null" : Number(r.lat);
    const lngVal = r.lng === null ? "null" : Number(r.lng);
    return `('${r.name}', ${r.capacity}, ${r.available}, '${r.status}', ${latVal}, ${lngVal})`;
  })
  .join(",\n  ");

const sql = `-- Auto-generated from src/data/parking-lots.ts (EXTENDED_PARKING_LOTS)
-- Inserts into parking_lots only if a row with same name (case-insensitive) doesn't already exist.
-- Columns: name, capacity, available, status, lat, lng

insert into parking_lots (name, capacity, available, status, lat, lng)
select v.name, v.capacity, v.available, v.status, v.lat, v.lng
from (
  values
  ${valuesSql}
) as v(name, capacity, available, status, lat, lng)
where not exists (
  select 1 from parking_lots p
  where lower(p.name) = lower(v.name)
);

-- You can verify:
-- select count(*) from parking_lots;
-- select name, capacity, available, status from parking_lots order by name;
`;

fs.writeFileSync(outPath, sql, "utf8");
console.log(` Generated: ${outPath} (${rows.length} rows)`);
