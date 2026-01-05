import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function toInt(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toFloat(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normStatus(v: any): string {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("open")) return "open";
  if (s.includes("full") || s.includes("closed")) return "closed";
  return "unknown";
}

serve(async () => {
  console.log("🚀 sync-parking-lots invoked");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return jsonResponse({ error: "Missing env vars" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const res = await fetch("https://traffic.ottawa.ca/map/service/parking", {
    headers: { Accept: "application/json" },
  });

  console.log("📡 Ottawa API status:", res.status);

  if (!res.ok) {
    return jsonResponse({ error: "Ottawa API failed" }, 502);
  }

  const payload = await res.json();
  console.log("📦 Payload keys:", Object.keys(payload));

  // ✅ HERE IS THE FIX
  const items = Array.isArray(payload?.parking_lots)
    ? payload.parking_lots
    : [];

  if (!items.length) {
    console.error("❌ No items found");
    return jsonResponse({ error: "No items found" }, 502);
  }

  console.log("🧪 SAMPLE_KEYS:", Object.keys(items[0]));

  const now = new Date().toISOString();

  const rows = items.map((it: any) => ({
    ottawa_lot_id: String(it.id),
    name: it.name ?? "Ottawa Parking Lot",
    capacity: toInt(it.capacity),
    available: toInt(it.available),
    status: normStatus(it.status),
    lat: toFloat(it.latitude),
    lng: toFloat(it.longitude),
    source: "open_ottawa_arcgis",
    data_mode: "realtime",
    api_provider: "traffic.ottawa.ca",
    has_live_api: true,
    is_mock: false,
    last_seen_at: now,
    last_api_seen_at: now,
    updated_at: now,
  }));

  console.log("⬆️ Upserting:", rows.length);

  const { error } = await supabase
    .from("parking_lots")
    .upsert(rows, { onConflict: "ottawa_lot_id" });

  if (error) {
    console.error("❌ DB error", error);
    return jsonResponse({ error }, 500);
  }

  return jsonResponse({
    ok: true,
    upserted: rows.length,
    sample: rows[0],
  });
});
