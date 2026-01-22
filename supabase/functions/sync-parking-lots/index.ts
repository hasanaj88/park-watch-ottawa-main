// supabase/functions/sync-parking-lots/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toNullableInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toFloat(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// normalize Ottawa status to values you can map later in UI/DB
function normStatus(v: unknown): string {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("open") || s.includes("available")) return "open";
  if (s.includes("full") || s.includes("closed") || s.includes("busy")) return "closed";
  return "unknown";
}

type OttawaParkingLot = {
  id: string | number;
  name?: string | null;
  capacity?: number | string | null;
  available?: number | string | null;
  status?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type OttawaPayload = {
  parking_lots?: OttawaParkingLot[];
};

serve(async (req: Request) => {
  console.log("🚀 sync-parking-lots invoked");

  // ✅ Security: shared secret
  const expectedKey = Deno.env.get("SYNC_KEY") ?? "";
  const gotKey = req.headers.get("x-sync-key") ?? "";

  if (!expectedKey || gotKey !== expectedKey) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // ✅ Only POST
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

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
    const t = await res.text().catch(() => "");
    return jsonResponse({ error: "Ottawa API failed", status: res.status, body: t }, 502);
  }

  const payload = (await res.json().catch(() => null)) as OttawaPayload | null;
  if (!payload) {
    return jsonResponse({ error: "Invalid JSON from Ottawa API" }, 502);
  }

  const items = Array.isArray(payload.parking_lots) ? payload.parking_lots : [];

  if (!items.length) {
    console.error("❌ No items found");
    return jsonResponse({ error: "No items found" }, 502);
  }

  console.log("🧪 SAMPLE_KEYS:", Object.keys(items[0] ?? {}));

  const now = new Date().toISOString();

  const rows = items.map((it) => {
    const capacity = toInt(it.capacity);
    const available = toNullableInt(it.available);

    // Safety clamp: don't allow negative or > capacity values
    const safeAvailable =
      available === null
        ? null
        : Math.max(0, Math.min(available, Math.max(0, capacity)));

    return {
      ottawa_lot_id: String(it.id),
      name: it.name ?? "Ottawa Parking Lot",

      capacity,
      // IMPORTANT: keep null if unknown, don't force 0
      available: safeAvailable,

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
    };
  });

  console.log("⬆️ Upserting:", rows.length);

  const { error } = await supabase
    .from("parking_lots")
    .upsert(rows, { onConflict: "ottawa_lot_id" });

  if (error) {
    console.error("❌ DB error", error);
    return jsonResponse({ error: error.message ?? error }, 500);
  }

  return jsonResponse({
    ok: true,
    upserted: rows.length,
    sample: rows[0],
  });
});
