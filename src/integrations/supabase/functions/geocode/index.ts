// supabase/functions/geocode/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Nominatim is picky about User-Agent/Referer; edge env is fine,
      // but we also set cache headers for safety.
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  try {
    const { q } = await req.json();
    const query = String(q ?? "").trim();

    if (!query) return json({ error: "Missing q" }, 400);

    // Bias results toward Ottawa
    const params = new URLSearchParams({
      q: `${query}, Ottawa, Ontario, Canada`,
      format: "json",
      addressdetails: "1",
      limit: "1",
    });

    const url = `${NOMINATIM_URL}?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        // Required by Nominatim usage policy (identify your app)
        "User-Agent": "OttawaLiveParking/1.0 (contact: admin@ottawaliveparking.ca)",
        "Accept": "application/json",
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
