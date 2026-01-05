// scripts/generate-insert-sql.mjs
import fs from "node:fs";
import path from "node:path";

const inputPath = path.resolve("src/data/mockParkingLots.ts");
const outPath = path.resolve("scripts/insert_mock_parking_lots.sql");

const raw = fs.readFileSync(inputPath, "utf8");

// Catch array: export const MOCK_PARKING_LOTS = [ ... ];
const match = raw.match(/MOCK_PARKING_LOTS\s*=\s*\[([\s\S]*?)\]\s*;/m);
if (!match) {
  console.error("Could not find MOCK_PARKING_LOTS array in mockParkingLots.ts");
  process.exit(1);
}

const arrayBody = match[1];

// Catch each object {...}
const objMatches = arrayBody.match(/\{[\s\S]*?\}/g) || [];

const rows = objMatches.map((objStr) => {
  const name = (objStr.match(/name:\s*"([^"]+)"/)?.[1] ?? "").trim();
  const free = Number(objStr.match(/free:\s*([0-9]+)/)?.[1] ?? "0");
  const total = Number(objStr.match(/total:\s*([0-9]+)/)?.[1] ?? "0");
  const statusRaw = (objStr.match(/status:\s*"([^"]+)"/)?.[1] ?? "unknown").trim();

  // Normalize status
  const s = statusRaw.toLowerCase();
  let status = "unknown";
  if (["open", "available"].includes(s)) status = "open";
  else if (["busy", "high"].includes(s)) status = "busy";
  else if (["full", "closed"].includes(s)) status = "full";
  else if (["estimated"].includes(s)) status = "estimated";

  // Escape single quotes for SQL
  const safeName = name.replace(/'/g, "''");

  return { name: safeName, capacity: total, available: free, status };
});

// Generate SQL
const sql =
  `-- Auto-generated from src/data/mockParkingLots.ts\n` +
  `-- Inserts into parking_lots (name, capacity, available, status)\n\n` +
  `insert into parking_lots (name, capacity, available, status)\nvalues\n` +
  rows
    .map(
      (r) =>
        `  ('${r.name}', ${r.capacity}, ${r.available}, '${r.status}')`
    )
    .join(",\n") +
  `\n;\n`;

fs.writeFileSync(outPath, sql, "utf8");
console.log(`Generated: ${outPath} (${rows.length} rows)`);
