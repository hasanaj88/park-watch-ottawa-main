// supabase/functions/geocode/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow from anywhere
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  try {
    const { q } = await req.json();
    const query = String(q ?? "").trim();

    if (!query) return json({ error: "Missing q" }, 400);

    const params = new URLSearchParams({
      q: `${query}, Ottawa, Ontario, Canada`,
      format: "json",
      addressdetails: "1",
      limit: "1",
    });

    const url = `${NOMINATIM_URL}?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "OttawaLiveParking/1.0 (contact: admin@ottawaliveparking.ca)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return json({ error: "Geocoding failed", status: res.status }, 502);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return json({ found: false, q: query });
    }

    const item = data[0];
    const lat = Number(item.lat);
    const lng = Number(item.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json({ found: false, q: query });
    }

    return json({
      found: true,
      q: query,
      lat,
      lng,
      displayName: item.display_name ?? null,
    });
  } catch (e) {
    return json({ error: "Bad request", details: String(e) }, 400);
  }
});
